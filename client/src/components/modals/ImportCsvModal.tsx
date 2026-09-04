import React, { useState, useRef } from 'react';
import { X, Upload, FileText, CheckCircle2, AlertCircle, RefreshCw, Users, Building2, Download } from 'lucide-react';
import { api } from '../../services/api';

interface ImportCsvModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'candidates' | 'employers';
  onSuccess: () => void;
}

export const ImportCsvModal: React.FC<ImportCsvModalProps> = ({
  isOpen,
  onClose,
  type,
  onSuccess
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const parseCsvLine = (line: string, delimiter: string): string[] => {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    return values;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setErrorMessage(null);
    setResultMessage(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        let text = (event.target?.result as string) || '';
        // Strip UTF-8 BOM if present
        if (text.charCodeAt(0) === 0xFEFF) {
          text = text.substring(1);
        }

        const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
        if (lines.length < 2) {
          setErrorMessage('Файл повинен містити рядок заголовків та хоча б один рядок даних');
          return;
        }

        // Auto-detect delimiter (; or , or \t)
        const firstLine = lines[0];
        let delimiter = ';';
        if (firstLine.includes(';') && !firstLine.includes(',')) delimiter = ';';
        else if (firstLine.includes(',') && !firstLine.includes(';')) delimiter = ',';
        else if (firstLine.includes('\t')) delimiter = '\t';
        else if ((firstLine.match(/;/g) || []).length >= (firstLine.match(/,/g) || []).length) delimiter = ';';
        else delimiter = ',';

        const rawHeaders = parseCsvLine(firstLine, delimiter).map(h => h.replace(/^["']|["']$/g, '').trim());
        setColumns(rawHeaders);

        const rows: any[] = [];
        for (let i = 1; i < lines.length; i++) {
          const rowVals = parseCsvLine(lines[i], delimiter).map(v => v.replace(/^["']|["']$/g, '').trim());
          if (rowVals.every(v => v === '')) continue;
          const rowObj: any = {};
          rawHeaders.forEach((h, idx) => {
            rowObj[h] = rowVals[idx] || '';
          });
          rows.push(rowObj);
        }

        setParsedRows(rows);
      } catch (err: any) {
        setErrorMessage('Помилка обробки файлу: ' + err.message);
      }
    };
    reader.readAsText(selected, 'UTF-8');
  };

  const handleStartImport = async () => {
    if (parsedRows.length === 0) return;
    setIsLoading(true);
    setErrorMessage(null);
    setResultMessage(null);

    try {
      const endpoint = type === 'candidates' ? '/import/candidates' : '/import/employers';
      const payload = type === 'candidates' 
        ? { candidates: parsedRows }
        : { employers: parsedRows };

      const res = await api.post(endpoint, payload);
      setResultMessage(res.data?.message || 'Імпорт успішно завершено!');
      onSuccess();
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (e: any) {
      setErrorMessage(e.response?.data?.error || 'Помилка виконання імпорту');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadSample = () => {
    let csvSample = '';
    if (type === 'candidates') {
      csvSample = '\uFEFFПІБ;Телефон;Країна;Професія;Статус;Email\r\n' +
        'Абдуллаєв Сардор;+998901234567;Узбекистан;Зварювальник MIG/MAG;Скринінг / Анкета;sardor@example.com\r\n' +
        'Кумар Раджеш;+919876543210;Індія;Оператор CNC;Кваліфіковано;rajesh@example.com\r\n' +
        'Мехмет Йилмаз;+905551234567;Туреччина;Слюсар-складальник;Оформлення візи D;mehmet@example.com';
    } else {
      csvSample = '\uFEFFНазва;Телефон;Email;Адреса;Сайт\r\n' +
        'ТОВ "Завод Металоконструкцій";+380441112233;contact@metal-factory.com;м. Київ, вул. Промислова 12;www.metal-factory.com\r\n' +
        'ПрАТ "Логістик Транс";+380322223344;office@logistic-trans.ua;м. Львів, вул. Городоцька 280;www.logistic-trans.ua';
    }

    const blob = new Blob([csvSample], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sample_${type}_template.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#0b101b] border border-white/10 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center">
              {type === 'candidates' ? <Users className="w-5 h-5" /> : <Building2 className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                {type === 'candidates' ? 'Імпорт кандидатів з Excel (CSV)' : 'Імпорт підприємств з Excel (CSV)'}
              </h2>
              <p className="text-xs text-slate-400">
                Завантажте таблицю з базою для масового додавання в 1 клік
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Action Row */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleDownloadSample}
              className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1.5 transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Завантажити зразок шаблону (.CSV)</span>
            </button>
            <span className="text-[11px] text-slate-400">Підтримує розділювачі: крапка з комою (;) або кома (,)</span>
          </div>

          {/* Upload Zone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-white/15 hover:border-blue-500/50 rounded-2xl p-6 text-center cursor-pointer bg-slate-900/30 hover:bg-slate-900/60 transition group"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".csv,.txt,.tsv"
              className="hidden"
            />
            <div className="w-12 h-12 rounded-2xl bg-blue-600/10 text-blue-400 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition">
              <Upload className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-white">
              {file ? file.name : 'Натисніть або перетягніть CSV-файл сюди'}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {file ? `${(file.size / 1024).toFixed(1)} KB • Розпізнано рядків: ${parsedRows.length}` : 'Файли Excel, експортовані у форматі CSV (розділювач - крапка з комою)'}
            </p>
          </div>

          {/* Alerts */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {resultMessage && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{resultMessage}</span>
            </div>
          )}

          {/* Preview Table */}
          {parsedRows.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                <span>Попередній перегляд (перші {Math.min(5, parsedRows.length)} із {parsedRows.length} записів):</span>
                <span className="text-[11px] text-emerald-400 font-mono">Готово до імпорту</span>
              </div>

              <div className="overflow-x-auto border border-white/10 rounded-xl max-h-48 bg-slate-950/60 text-xs">
                <table className="w-full text-left">
                  <thead className="bg-slate-900 border-b border-white/10 text-slate-400 font-semibold sticky top-0">
                    <tr>
                      {columns.slice(0, 5).map((col, idx) => (
                        <th key={idx} className="p-2.5 whitespace-nowrap">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-slate-200">
                    {parsedRows.slice(0, 5).map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-white/5">
                        {columns.slice(0, 5).map((col, cIdx) => (
                          <td key={cIdx} className="p-2.5 whitespace-nowrap max-w-[160px] truncate">
                            {row[col] || '-'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/10 bg-slate-900/50 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-xl hover:bg-white/5 transition"
          >
            Скасувати
          </button>

          <button
            type="button"
            onClick={handleStartImport}
            disabled={isLoading || parsedRows.length === 0}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-blue-600/30"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Імпортуємо...</span>
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                <span>Імпортувати {parsedRows.length} записів</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
