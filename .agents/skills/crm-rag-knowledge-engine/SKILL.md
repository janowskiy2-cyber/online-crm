---
name: crm-rag-knowledge-engine
description: >-
  Use this skill when building or modifying Retrieval-Augmented Generation (RAG) pipelines,
  semantic text embeddings, candidate-to-vacancy vector matchmaking, resume/CV parsing,
  synaptic domain dictionaries, and enterprise knowledge grounding in the CRM.
---

# CRM RAG & Knowledge Engine

This skill defines the technical standards for vector embeddings, context grounding, semantic search, and document extraction within the CRM.

## 1. Grounded Knowledge & Anti-Hallucination

- **Strict Source Grounding:** When querying knowledge bases (company objection scripts, legal pricing tables, vacancy specifications), LLM prompts must strictly bind answers to provided CRM context (context). If data is missing, the model must explicitly state what is missing rather than inventing facts.
- **Cost-Effective Embeddings:**
  - Use gemini-embedding-2 / 	ext-embedding-004 (1,500 RPM free limit in Google AI Studio).
  - Compute cosine similarity across candidate vector profiles and job order requirements.
  - Return ranking score (0.0 to 1.0) with top matched qualification badges.

## 2. Synaptic Semantic Search (Sub-5ms Expansion)

- **Domain Synapses Map (DOMAIN_SYNAPSE_MAP):**
  - Always maintain a static, instant in-memory mapping for high-frequency recruitment and sales terms (e.g. *сварщик ➔ зварювальник, mig/mag, semi-automatic, tig, welder*).
  - Static resolution executes in <1ms without calling external networks.
- **In-Memory TTL Caching:**
  - Cache all semantic expansions for 1 hour (	tl: 3600_000).
  - Identical and repeated search queries bypass API calls completely.
- **Prisma Insensitive Match:**
  - Expand incoming user queries into terms array and query relational columns across 	itle, contact.name, contact.phone, company.name, stage.name, and 	ags using mode: 'insensitive'.

## 3. Automated Document & Resume Parsing

- **Multi-Format Ingestion:** Accept PDF, DOCX, CSV, and plain text pastes.
- **Structured Entity Extraction:** Extract normalized JSON:
  - 
ame: Candidate full name
  - phone / whatsapp: Normalized E.164 format (+380..., +998...)
  - country: Country of origin (Ukraine, Uzbekistan, India, Turkey, etc.)
  - profession: Target occupational role
  - experienceYears: Integer count
  - skills: Array of verified technical competencies
