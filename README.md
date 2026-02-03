# RAG Demo Project

A demonstration project showcasing Retrieval-Augmented Generation (RAG) implementation.

## Overview

This project demonstrates how to build a RAG system that combines the power of large language models with external knowledge retrieval to provide more accurate and contextually relevant responses.

## What is RAG?

Retrieval-Augmented Generation (RAG) is a technique that enhances LLM responses by:

1. **Retrieving** relevant documents from a knowledge base
2. **Augmenting** the prompt with retrieved context
3. **Generating** responses grounded in the retrieved information

This approach helps reduce hallucinations and enables the model to access up-to-date or domain-specific information.

## Tech Stack

**Backend:** Nest.js, Prisma, PostgreSQL, Redis, MinIO, Chroma, Ollama

**Frontend:** React, Tanstack Router, Tanstack Query, shadcn/ui

## Features

- Chat interface for querying the knowledge base
- Admin panel for managing articles and images
- JWT authentication (access + refresh tokens)
- Document chunking and embedding
- Image description generation and embedding

## Documentation

- [Architecture](./docs/architecture.md) - System design, data models, API endpoints
