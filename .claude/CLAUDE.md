# Backpackr — Tumblbug Analytics Tools

This repository hosts reusable Claude Code skills for the Tumblbug (텀블벅) crowdfunding platform.

## Repository Structure

```
.claude/
├── CLAUDE.md          ← this file
└── skills/
    └── tag-trend-report/
        ├── SKILL.md
        ├── scripts/
        │   └── analyze.py
        └── references/
            └── tag_synonyms.json
```

## Available Skills

| Skill            | Trigger phrase                                          | Purpose                                              |
|------------------|---------------------------------------------------------|------------------------------------------------------|
| tag-trend-report | "태그 트렌드 분석", "트렌드 리포트", "keyword trend report" | 카테고리별 + 종합 태그 트렌드 `.md` 리포트 자동 생성 |

## Data Format

All skills operate on SQL query exports from the Tumblbug data warehouse.

Required columns: `project_id`, `project_title`, `creator_id`, `category`,
`subcategory`, `launch_date`, `end_date`, `goal_amount`, `pledged_amount`,
`backer_count`, `average_pledge`, `keywords`

## Running Skills

Skills are invoked through Claude Code. Type a trigger phrase or `/tag-trend-report` to begin.
Claude will prompt for the data file path if not supplied.
