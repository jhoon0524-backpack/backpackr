# Skill: tag-trend-report

## Trigger Patterns

Invoke this skill when the user says any of the following (case-insensitive):
- "analyze tag trends" / "tag trend report" / "keyword trend"
- "태그 트렌드" / "태그 트렌드 분석" / "키워드 트렌드" / "트렌드 리포트"
- "/tag-trend-report"

## Description

Analyze crowdfunding project data exported from the Tumblbug database, cluster project
keywords into semantic tag groups using a synonym dictionary, calculate funding performance
metrics per cluster, and generate structured Markdown trend reports — one per category and
one comprehensive summary.

## Input

The user must supply ONE of:
- A CSV file path
- A JSON file path (array of objects with the same fields)

### Required columns / fields

| Field          | Type   | Description                                      |
|----------------|--------|--------------------------------------------------|
| project_id     | string | Unique project identifier                        |
| project_title  | string | Project title (Korean or English)                |
| creator_id     | string | Creator account identifier                       |
| category       | string | Top-level category (e.g. 출판, 게임)              |
| subcategory    | string | Subcategory (e.g. 소설, 보드게임)                 |
| launch_date    | string | ISO date YYYY-MM-DD                              |
| end_date       | string | ISO date YYYY-MM-DD                              |
| goal_amount    | number | Funding goal in KRW                              |
| pledged_amount | number | Total pledged in KRW                             |
| backer_count   | number | Number of backers                                |
| average_pledge | number | Average pledge per backer in KRW                 |
| keywords       | string | Comma-separated tag/keyword list for the project |

## Output

All output files are written to a user-specified directory (default: `./reports/`):

| File                   | Contents                                         |
|------------------------|--------------------------------------------------|
| `summary.md`           | Comprehensive cross-category trend report        |
| `<category_slug>.md`   | Per-category trend report (one file per category)|

Category slug mapping: 예술→art, 음악→music, 영화/비디오→film, 출판→publishing,
게임→game, 기술/디자인→tech_design, 패션→fashion, 음식→food

## Step-by-Step Instructions

### Step 1 — Gather inputs

1a. If the user has not provided a data file path, ask:
    "분석할 데이터 파일 경로를 알려주세요 (CSV 또는 JSON)."

1b. If the user has not provided an output directory, default to `./reports/` and
    inform the user: "리포트는 `./reports/` 에 저장됩니다."

1c. Verify the input file exists using the Read tool or Bash `ls`. If it does not exist,
    tell the user and stop.

### Step 2 — Locate the skill scripts

- Analysis script: `.claude/skills/tag-trend-report/scripts/analyze.py`
- Synonym dictionary: `.claude/skills/tag-trend-report/references/tag_synonyms.json`

Use absolute paths when running commands.

### Step 3 — Run the analysis

```bash
python3 .claude/skills/tag-trend-report/scripts/analyze.py \
  --input <INPUT_FILE_PATH> \
  --output <OUTPUT_DIR> \
  --synonyms .claude/skills/tag-trend-report/references/tag_synonyms.json
```

Capture stdout and stderr. If the script exits with a non-zero code, show the error to
the user and stop.

### Step 4 — Read and summarize the reports

4a. Read `<OUTPUT_DIR>/summary.md` using the Read tool.
4b. List all `*.md` files in `<OUTPUT_DIR>` and read each per-category report.
4c. Present the key findings to the user:
    - Top 3 trending tag clusters overall (by avg_funding_rate)
    - Category with the highest average funding rate
    - Any cluster with avg_funding_rate > 200% (outstanding performers)
    - Any cluster with < 5 projects (flag as low-confidence, tentative)

### Step 5 — Offer follow-up actions

Ask the user if they would like to:
a) View a specific category report in full
b) Export a particular section as a table to the chat
c) Re-run with a different synonym mapping
d) Filter by date range and re-run (remind them to pre-filter their SQL export)

## Error Handling

| Condition                    | Action                                                   |
|------------------------------|----------------------------------------------------------|
| Input file missing           | Tell user, stop                                          |
| Input file has wrong columns | Show which columns are missing, stop                     |
| All rows have empty keywords | Warn user; report will use subcategory-based clusters    |
| Output dir is not writable   | Tell user to check permissions, stop                     |
| Python not found             | Tell user to ensure Python 3.8+ is installed             |

## Notes

- The skill uses only Python 3 standard library — no pip installs required.
- Korean characters in filenames and content are fully supported (UTF-8).
- The synonym dictionary can be extended by editing `references/tag_synonyms.json`.
- Funding rate = pledged_amount / goal_amount × 100 (%). Values > 100% = fully funded.
- A project can belong to multiple tag clusters simultaneously.
- Unrecognised tags are stored as `기타/<tag>` so no data is discarded.
