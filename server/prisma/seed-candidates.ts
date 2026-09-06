import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { ResumePdfService, ResumeData } from '../src/services/resume-pdf.service';

const prisma = new PrismaClient();

interface CandidateSeedProfile extends ResumeData {
  status: string;
  assignedCompanyIndex?: number;
  videoUrl?: string;
}

async function main() {
  console.log('🚀 Починаю створення 20 професійних кандидатів та генерацію A4 PDF резюме...');

  // 1. Load candidates data from JSON
  const jsonPath = path.join(__dirname, 'candidates-data.json');
  const candidatesData: CandidateSeedProfile[] = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

  // 2. Ensure realistic employer companies exist
  const existingCompanies = await prisma.company.findMany({ where: { isDeleted: false } });
  let companies = existingCompanies;

  if (companies.length === 0) {
    console.log('🏢 Створюю компанії-роботодавці для прив\'язки...');
    const c1 = await prisma.company.create({
      data: {
        name: 'Polmetal Sp. z o.o. (Польща)',
        address: 'Вроцлав, Польща • Металообробка та важке машинобудування',
        phone: '+48712345678',
        email: 'hr@polmetal.pl',
        website: 'https://polmetal.example.com'
      }
    });
    const c2 = await prisma.company.create({
      data: {
        name: 'TransLogistics Europe (Німеччина / Польща)',
        address: 'Берлін — Познань • Міжнародні автомобільні перевезення',
        phone: '+493012345678',
        email: 'fleet@translogistics.eu',
        website: 'https://translogistics.example.com'
      }
    });
    const c3 = await prisma.company.create({
      data: {
        name: 'Nordic Build Group (Швеція / Польща)',
        address: 'Стокгольм — Краків • Монолітне та промислове будівництво',
        phone: '+46812345678',
        email: 'info@nordicbuild.se',
        website: 'https://nordicbuild.example.com'
      }
    });
    const c4 = await prisma.company.create({
      data: {
        name: 'AgroFruit & Retail Hub (Польща)',
        address: 'Варшава, Польща • Логістика харчової продукції та рітейл',
        phone: '+482212345678',
        email: 'jobs@agrofruit.pl',
        website: 'https://agrofruit.example.com'
      }
    });
    companies = [c1, c2, c3, c4];
  }

  const uploadsDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  let createdCount = 0;

  for (let i = 0; i < candidatesData.length; i++) {
    const cand = candidatesData[i];
    console.log(`\n[${i + 1}/20] 📄 Обробка кандидата: ${cand.name} (${cand.profession})...`);

    // 3. Generate pristine A4 PDF Resume Buffer
    const pdfBuffer = await ResumePdfService.generateResumeBuffer({
      name: cand.name,
      profession: cand.profession,
      country: cand.country,
      citizenship: cand.citizenship,
      birthDate: cand.birthDate,
      phone: cand.phone,
      email: cand.email,
      whatsapp: cand.whatsapp,
      telegram: cand.telegram,
      experienceYears: cand.experienceYears,
      salaryExpectation: cand.salaryExpectation,
      languages: cand.languages,
      driverLicense: cand.driverLicense,
      bio: cand.bio,
      skills: cand.skills,
      workExperience: cand.workExperience,
      education: cand.education,
      certificates: cand.certificates
    });

    // 4. Save physical PDF to uploads directory
    const cleanName = cand.name.replace(/[^a-zA-Zа-яА-ЯіІїЇєЄ0-9_-]/g, '_');
    const fileName = `CV_${cleanName}.pdf`;
    const localFilePath = path.join(uploadsDir, fileName);
    fs.writeFileSync(localFilePath, pdfBuffer);

    const targetCompany = cand.assignedCompanyIndex !== undefined && companies[cand.assignedCompanyIndex]
      ? companies[cand.assignedCompanyIndex]
      : (companies[i % companies.length] || null);

    // Initial check if candidate with this name or phone already exists
    const existing = await prisma.contact.findFirst({
      where: {
        OR: [
          { name: cand.name },
          { phone: cand.phone }
        ]
      }
    });

    const docItem = {
      id: `doc_resume_${Date.now()}_${i}`,
      name: `Офіційне Резюме (PDF) - ${cand.name}`,
      url: `/api/uploads/${fileName}`,
      type: 'application/pdf',
      category: 'resume',
      size: pdfBuffer.length,
      uploadedAt: new Date().toISOString()
    };

    let candidateId = existing?.id;

    if (existing) {
      console.log(`   🔄 Оновлюю існуючу анкету ${cand.name}...`);
      const updated = await prisma.contact.update({
        where: { id: existing.id },
        data: {
          name: cand.name,
          profession: cand.profession,
          position: cand.profession,
          type: 'candidate',
          country: cand.country,
          citizenship: cand.citizenship,
          birthDate: cand.birthDate,
          phone: cand.phone,
          whatsapp: cand.whatsapp,
          telegram: cand.telegram,
          email: cand.email,
          experienceYears: cand.experienceYears,
          salaryExpectation: cand.salaryExpectation,
          languages: cand.languages,
          driverLicense: cand.driverLicense,
          bio: cand.bio,
          skills: JSON.stringify(cand.skills),
          status: cand.status,
          companyId: targetCompany?.id || null,
          resumeUrl: `/api/contacts/${existing.id}/resume.pdf`,
          documents: JSON.stringify([docItem]),
          isDeleted: false,
          deletedAt: null
        }
      });
      candidateId = updated.id;
    } else {
      console.log(`   ✨ Створюю нового кандидата ${cand.name}...`);
      const created = await prisma.contact.create({
        data: {
          name: cand.name,
          profession: cand.profession,
          position: cand.profession,
          type: 'candidate',
          country: cand.country,
          citizenship: cand.citizenship,
          birthDate: cand.birthDate,
          phone: cand.phone,
          whatsapp: cand.whatsapp,
          telegram: cand.telegram,
          email: cand.email,
          experienceYears: cand.experienceYears,
          salaryExpectation: cand.salaryExpectation,
          languages: cand.languages,
          driverLicense: cand.driverLicense,
          bio: cand.bio,
          skills: JSON.stringify(cand.skills),
          status: cand.status,
          companyId: targetCompany?.id || null,
          documents: JSON.stringify([docItem])
        }
      });
      candidateId = created.id;

      // Update resumeUrl with candidate id
      await prisma.contact.update({
        where: { id: candidateId },
        data: {
          resumeUrl: `/api/contacts/${candidateId}/resume.pdf`
        }
      });
    }

    createdCount++;
    console.log(`   ✅ Успішно! PDF: ${fileName} (${pdfBuffer.length} байт). ID: ${candidateId}`);
  }

  console.log(`\n🎉 ГОТОВО! Успішно створено та оформлено ${createdCount} професійних кандидатів з PDF резюме.`);
}

main()
  .catch((e) => {
    console.error('❌ Помилка сіду кандидатів:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
