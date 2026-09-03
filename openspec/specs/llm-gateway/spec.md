# llm-gateway Specification

## Purpose

Provides a single LiteLLM gateway path for all model API traffic so the bot never calls provider APIs directly at runtime.

## Requirements

### Requirement: All model traffic uses LiteLLM
The system MUST send chat, speech-to-text, and text-to-speech requests exclusively to the configured LiteLLM gateway base URL. The system MUST NOT call `api.openai.com` (or other provider endpoints) directly for these operations at runtime.

#### Scenario: Chat completion via gateway
- **WHEN** any feature requests a chat completion
- **THEN** the request is sent to the LiteLLM gateway using the configured base URL and API key

#### Scenario: Audio via gateway
- **WHEN** any feature requests speech-to-text or text-to-speech
- **THEN** the request is sent to the LiteLLM gateway using the configured base URL and API key

### Requirement: Gateway credentials from environment
The system MUST obtain the LiteLLM base URL and API key from environment configuration. If required LiteLLM configuration is missing when a model call is attempted, the system MUST fail the operation with a clear error rather than falling back to a direct provider API.

#### Scenario: Missing gateway configuration
- **WHEN** a model call is attempted and LiteLLM base URL or API key is not configured
- **THEN** the operation fails without contacting a provider API directly

### Requirement: Chat uses the default chat model
The system MUST use the persisted default chat model id for chat completions unless a feature has an explicitly documented exception (none in this change: all chat paths use the default).

#### Scenario: Default model applied to chat
- **WHEN** a chat completion is requested
- **THEN** the request includes the current default chat model id
