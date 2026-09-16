from __future__ import annotations
import os
from app.ai.groq_client import GroqClient


class LangChainPipeline:
    def __init__(self, groq_client: GroqClient | None = None):
        self.groq = groq_client or GroqClient()

    async def summarize_table(self, table_schema: dict) -> str:
        text = str(table_schema)
        sample_path = os.path.join(
            os.path.dirname(__file__),
            "..",
            "data",
            "sample.json",
        )
        sample_path = os.path.normpath(sample_path)
        if os.path.exists(sample_path):
            try:
                with open(sample_path, "r", encoding="utf-8") as f:
                    sample_text = f.read()
                text += "\n\nSAMPLE_EMPLOYEES:\n" + sample_text
            except Exception:
                pass

        return await self.groq.generate_summary(text)

    async def analyze_request(self, schema, user_message):
        prompt = f"""
        You are an intelligent data dictionary assistant.
        
        Determine what the user wants:
        SCHEMA = questions about databases, tables, columns, relationships, metadata, structure, definitions, or schema.
        QUERY = questions requiring actual data from the database.
        MIXED = requires both schema information and actual database data.
        
        Return ONLY valid JSON:
        {{
            "intent": "SCHEMA | QUERY | MIXED",
            "sql": null,
            "response": "brief conversational response"
            }}
            
        If intent is QUERY or MIXED, generate the SQL query.
        If intent is SCHEMA, sql must be null.
        
        Database schema:
        {schema}
        
        Conversation and latest user question:
        {user_message}
"""
        return await self.groq.generate_summary(prompt)

    async def analyze_mongodb_request(self, schema, user_message):
        prompt = f"""
        You are a MongoDB data assistant. Return ONLY valid JSON.
        Determine whether the user asks for SCHEMA, QUERY, or MIXED information.
        For QUERY or MIXED, identify a collection from the schema and create a MongoDB filter.
        Use an empty filter for requests to list records. Preserve exact email values.
        Return this shape:
        {{
            "intent": "SCHEMA | QUERY | MIXED",
            "collection": null,
            "filter": {{}},
            "projection": null,
            "limit": 100,
            "response": "brief answer"
        }}

        Schema:
        {schema}

        Conversation and latest user question:
        {user_message}
        """
        return await self.groq.generate_summary(prompt)

    async def analyze_postgresql_request(self, schema, user_message):
        prompt = f"""
        You are a PostgreSQL data assistant. Return ONLY valid JSON.
        Determine whether the user wants SCHEMA, QUERY, or MIXED information.
        For QUERY or MIXED, generate a safe SELECT query using ONLY the exact table
        and column names present in the schema. Never invent names such as people.
        For SCHEMA, sql must be null.
        Return this shape:
        {{
            "intent": "SCHEMA | QUERY | MIXED",
            "sql": null,
            "response": "brief answer"
        }}

        PostgreSQL schema:
        {schema}

        Conversation and latest user question:
        {user_message}
        """
        return await self.groq.generate_summary(prompt)
