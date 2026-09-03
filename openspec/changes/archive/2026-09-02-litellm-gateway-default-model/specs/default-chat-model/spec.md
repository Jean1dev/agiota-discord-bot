## Purpose

Lets Discord users view chat-capable models from LiteLLM and set a single persisted default chat model by choosing a numbered entry.

## ADDED Requirements

### Requirement: Public command to change default chat model
The system MUST expose a Discord text command `$modelo` that any authenticated Discord user in the bot's command flow MAY invoke (no admin restriction). Invoking `$modelo` without a selection flow already in progress MUST start the model selection flow described below.

#### Scenario: Non-admin can start selection
- **WHEN** any user runs `$modelo`
- **THEN** the bot starts the model selection flow (does not reject for lack of admin privileges)

### Requirement: List chat-capable models with numbers
When selection starts, the system MUST fetch the model catalog from the LiteLLM gateway and present a numbered list of chat-capable models only. The list MUST exclude wildcard entries (ids containing `*`) and models whose mode is not chat (for example image generation, video generation, realtime, audio speech, audio transcription, moderation).

#### Scenario: Numbered chat list
- **WHEN** a user runs `$modelo` and the gateway returns a mixed catalog
- **THEN** the bot replies with one or more messages listing only chat-capable models, each prefixed with a unique consecutive number starting at 1

#### Scenario: Discord message length
- **WHEN** the numbered list exceeds Discord's message length limit
- **THEN** the bot splits the list across multiple messages without truncating model entries mid-line when possible

### Requirement: Await numeric selection
After listing models, the system MUST wait for the same user to reply in the same channel with a single integer corresponding to a listed number, with a timeout of 120 seconds. On a valid number, the system MUST set that model's id as the default chat model. On timeout or invalid input, the system MUST inform the user and MUST NOT change the default.

#### Scenario: Valid number updates default
- **WHEN** the user replies with a number that matches a listed entry within 120 seconds
- **THEN** the default chat model becomes that entry's model id and the bot confirms the new default

#### Scenario: Invalid number
- **WHEN** the user replies with text that is not an integer in the listed range
- **THEN** the bot informs the user that the selection is invalid and the previous default remains unchanged

#### Scenario: Timeout
- **WHEN** 120 seconds pass without a qualifying reply from the same user
- **THEN** the bot informs the user that time expired and the previous default remains unchanged

### Requirement: Persist default chat model in MongoDB
The system MUST persist the default chat model id in MongoDB so it survives process restarts. On startup, the system MUST load the persisted default when present.

#### Scenario: Survives restart
- **WHEN** a user sets a default chat model and the bot process restarts
- **THEN** subsequent chat completions use the same default model id that was set before the restart

### Requirement: Fallback when no persisted default
When no default chat model has been persisted yet, the system MUST use a documented built-in fallback chat model id suitable for the gateway (for example `openai/gpt-4o`) until a user selects another via `$modelo`.

#### Scenario: First run uses fallback
- **WHEN** chat is requested and MongoDB has no stored default chat model
- **THEN** the system uses the built-in fallback chat model id

### Requirement: Show current default (optional shortcut)
When the user runs `$modelo atual`, the system MUST reply with the current default chat model id without starting the selection flow.

#### Scenario: Query current model
- **WHEN** a user runs `$modelo atual`
- **THEN** the bot replies with the current default chat model id and does not await a number
