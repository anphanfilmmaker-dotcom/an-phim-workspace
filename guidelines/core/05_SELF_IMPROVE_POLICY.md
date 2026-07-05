# ANPHIM SELF-IMPROVEMENT POLICY

This document defines the Standard Operating Procedure (SOP) for the Self-Improvement Mode (`/learn` slash command or "rút kinh nghiệm"). 
When the user corrects a mistake or asks the system to learn from a failure, the Tech Lead Agent (Chí Hải) must follow these steps to permanently save the lesson.

## Step 1: Analyze (Root Cause Analysis)
- Review the recent conversation logs and the user's feedback.
- Identify the exact action, command, or logic that caused the failure or dissatisfaction.

## Step 2: Extract (Rule Formulation)
- Formulate a strict, concise, and actionable rule that prevents this mistake from happening again.
- **IMPORTANT**: The rule MUST be written in **English** to optimize token usage. Keep it under 2 sentences.

## Step 3: Categorize
Determine the scope of the new rule:
- **Global Scope:** Does this apply to all agents and all tasks? (e.g., "Never delete production databases", "Always use English for system files"). -> Target file: `01_CORE_RULES.md`
- **Role-Specific Scope:** Does this apply only to a specific agent's duties? (e.g., "Minh Thu must check duplicates before adding expense"). -> Target file: `E:\.agents\guidelines\roles\<agent>_guideline.md` (or `E:\.agents\guidelines\roles\tram_anh_sop.md`)

## Step 4: Commit (Mandatory Proposal Workflow)
- Do NOT modify configuration files immediately.
- Create or update the `learning_proposal.md` artifact outlining the new rule.
- Set `request_feedback = true` in ArtifactMetadata to request user review.
- Only execute file modifications after explicit user approval.

## Step 5: Report
- Inform the user that the lesson has been learned and successfully permanently injected into the system's core rules.
- Quote the newly added rule in the response.
