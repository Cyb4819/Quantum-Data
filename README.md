# Intelligent Data Dictionary Agent

A software-only solution for connecting to enterprise databases, extracting schema metadata, analyzing data quality, and generating AI-enhanced data dictionaries with business-friendly documentation and a conversational AI interface.

## Problem Statement

Most organizations struggle with the following challenges:

- Source systems have inconsistent or missing schema documentation
- Metadata is stored in technical terms without business meaning
- Data quality issues are difficult to detect without manual analysis
- Analysts need a simpler, faster way to understand available datasets
- Documentation becomes stale as databases evolve over time

## Objective

Build a platform that:

- Connects to enterprise databases such as Snowflake, PostgreSQL, and SQL Server
- Extracts complete schema metadata including tables, columns, constraints, and relationships
- Analyzes data quality with metrics such as completeness, freshness, and key health
- Uses AI to generate business-friendly summaries and recommendations
- Produces documentation in formats such as JSON and Markdown
- Stores generated artifacts for future reference and reuse
- Enables users to ask natural-language questions about database schema and data

## Solution Approach

Our project addresses these problems with a layered approach that combines extraction, intelligence, and usability:

1. Database Connectivity and Schema Extraction
   - Connects to multiple database types through dedicated connectors
   - Reads metadata directly from system catalogs and schema definitions
   - Captures tables, columns, data types, constraints, keys, and relationships

2. Data Quality Analysis
   - Evaluates data health using completeness, freshness, and integrity checks
   - Identifies missing values, invalid patterns, and key inconsistencies
   - Supports statistical analysis and quality metrics to help users spot risks early

3. AI-Driven Business Context
   - Uses AI to transform technical metadata into business-friendly descriptions
   - Summarizes tables and fields in plain language
   - Recommends usage patterns and common interpretations for each dataset

4. Documentation and Artifact Management
   - Generates structured output in JSON and Markdown
   - Saves artifacts for versioning, auditability, and future retrieval

5. Conversational Access
   - Provides a chat interface where users can ask natural-language questions
   - Enables faster exploration of database structure and business meaning
   - Reduces dependency on technical database specialists for routine questions

This end-to-end workflow turns raw database metadata into valuable operational documentation that is both technically accurate and understandable for non-technical users.

## Key Features

- Support for multiple database platforms
- Automated extraction of schema metadata
- Relationship and constraint mapping
- Data quality scoring and analysis
- AI-generated table and column summaries
- Business-oriented recommendations
- Multi-format export (JSON, Markdown)
- Persistent artifact storage
- Natural-language data discovery through chat

## Optional Enhancements

The project also supports future extensions such as:

- Incremental update support when schema changes occur
- Data lineage and table relationship visualizations
- SQL query suggestions based on user questions
- Data quality alerts and trend monitoring

## Tech Stack

### Backend
- Python
- FastAPI
- Spring Boot
- SQLAlchemy / DB connectors
- AI integration via Groq

### Frontend
- Next.js
- TypeScript
- React
- Tailwind CSS

### Additional Backend Service
- Spring Boot Java service for the companion Data Dictionary Agent application

## Repository Structure

```text
Intelligent-Data-Dictionary-Agent/
├── Data Dictionary/
│   ├── backend/
│   │   ├── app/
│   │   ├── artifacts/
│   │   ├── tests/
│   │   └── requirements.txt
│   ├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   └── ...
├── data-dictionary-agent/
│   ├── src/
│   ├── pom.xml
│   └── ...
├── metadata.json
└── README.md
```

## Project Architecture

This repository is organized as a monorepo with separate concerns:

- Backend: Python FastAPI service for metadata extraction, quality checks, AI summaries, and exports
- Frontend: Next.js user interface for interaction and workflow management
- Java service: Spring Boot application used for the additional database agent workflow

## Data Dictionary Monorepo

This repository contains two main top-level projects:

- Data Dictionary/ — FastAPI backend and Next.js frontend
- data-dictionary-agent/ — Java Spring Boot application

## Getting Started

### 1) Backend Setup

From the repository root:

```bash
cd "Data Dictionary"
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

The backend exposes API endpoints such as:

- GET /healthz
- GET /api/extract/all
- GET /api/quality/table/{table_name}?sample=500
- POST /api/ai/summarize
- GET /api/export/markdown/{table_name}

### 2) Frontend Setup

```bash
cd "Data Dictionary"
cd frontend
npm install
npm run dev
```

### 3) Spring Boot Backend

To run the Java-based companion service:

- Open the Spring Boot project in your IDE
- Run the main application class, such as DataDictionaryAgentApplication.java

## Configuration Notes

- Backend reads database and AI configuration values from `backend/.env`
- A sample environment file may be available as `.env.example`
- The Groq integration requires a `GROQ_API_KEY` to be set in the environment
- Snowflake and SQL Server connectors may use synchronous drivers and may need special handling in production environments

## Notes and Considerations

- Snowflake and SQL Server connectors are thin wrappers and may perform synchronous operations
- In production, blocking database calls may need to be moved into executors or async patterns
- The solution is designed to support practical enterprise usage while remaining software-only and deployable in containerized or local environments

## Use Cases

This platform is useful for:

- Data stewards maintaining schema documentation
- Analysts trying to understand data sources quickly
- Engineers validating quality and consistency
- Business users exploring data without SQL knowledge
- Teams creating a shared data catalog for governance and discoverability

## Expected Outcome

By combining metadata extraction, quality scoring, and AI-generated explanations, this project creates a practical, intelligent data dictionary that makes enterprise data easier to understand, trust, and use.

## Summary

The Intelligent Data Dictionary Agent transforms fragmented database metadata into a clear, business-friendly, AI-powered documentation system. It brings together technical depth and business understandability, enabling teams to explore and use data with more confidence.
