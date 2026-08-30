# Implementation Plan: Phase 14 Architecture Hardening

## Overview

Replace post-commit commerce hooks with a PostgreSQL transactional outbox, add `@khepree/events` + `@khepree/platform`, then apply partner/CMS/auth/email/CI hardening. Stay a modular monolith.

## Status

Implemented in source (Phase 14). Docs synchronized. Not production-ready.

## Remaining (not this phase)

- B1 SePay sandbox proof
- Live email delivery proof
- Production infra / backup drill
- Optional further CommerceService/PartnerService file splits (M13)
