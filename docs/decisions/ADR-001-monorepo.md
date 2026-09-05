# ADR-001: Monorepo

## Decision

HomeGround uses a monorepo.

## Why

Web, mobile, and API share domain concepts, evidence definitions, and methodology.

A monorepo keeps those shared boundaries visible without requiring separate repositories or duplicated contracts.

## Consequence

Shared packages are allowed where there is a real shared responsibility.

App-specific behavior stays inside its owning application.

The monorepo does not imply that code should be shared prematurely.