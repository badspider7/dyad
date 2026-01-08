## ADDED Requirements

### Requirement: OpenSpec Workflow Recognition
Local Agent SHALL understand OpenSpec development workflow and automatically recognize when changes require formal proposals.

#### Scenario: Identifying proposal-required changes
- **WHEN** user requests new features, breaking changes, or architecture modifications
- **THEN** Local Agent SHALL apply OpenSpec decision tree to determine if proposal is needed
- **AND** inform user about the requirement for formal change proposal

#### Scenario: Direct implementation vs proposal
- **WHEN** user requests bug fixes or minor improvements
- **THEN** Local Agent SHALL proceed with direct implementation without proposal
- **AND** explain the decision based on OpenSpec guidelines

### Requirement: OpenSpec CLI Integration
Local Agent SHALL be able to execute OpenSpec CLI commands through its existing tool framework.

#### Scenario: Listing active changes
- **WHEN** user asks about current change proposals
- **THEN** Local Agent SHALL execute `openspec list` and present results
- **AND** provide context about each active proposal

#### Scenario: Validating proposals
- **WHEN** working with change proposals
- **THEN** Local Agent SHALL run `openspec validate --strict` to ensure correctness
- **AND** report validation results and suggest fixes if needed

#### Scenario: Reading proposal details
- **WHEN** user needs to understand a specific proposal
- **THEN** Local Agent SHALL execute `openspec show [proposal-id]` to retrieve details
- **AND** present the information in user-friendly format

### Requirement: OpenSpec-Aware Implementation Guidance
Local Agent SHALL incorporate OpenSpec best practices into its development workflow.

#### Scenario: Following proposal structure
- **WHEN** implementing approved changes
- **THEN** Local Agent SHALL read the proposal's `tasks.md` for implementation steps
- **AND** follow the checklist sequentially as defined in the proposal

#### Scenario: Spec compliance checking
- **WHEN** implementing features
- **THEN** Local Agent SHALL reference relevant specs from `openspec/specs/`
- **AND** ensure implementation aligns with defined requirements and scenarios

### Requirement: Enhanced System Prompt with OpenSpec
Local Agent's system prompt SHALL include comprehensive OpenSpec workflow knowledge.

#### Scenario: OpenSpec decision making
- **WHEN** evaluating change requests
- **THEN** Local Agent SHALL use OpenSpec decision tree from the prompt
- **AND** explain reasoning based on OpenSpec guidelines

#### Scenario: Workflow guidance
- **WHEN** user is unsure about process
- **THEN** Local Agent SHALL provide OpenSpec workflow guidance from its prompt
- **AND** help user navigate the specification-driven development process
