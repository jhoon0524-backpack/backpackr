#!/usr/bin/env python3
"""
analyze.py — Tumblbug Tag Trend Report Generator
Requires Python 3.8+. No third-party dependencies.

Usage:
    python3 analyze.py --input data.csv --output ./reports/ \
                       --synonyms ../references/tag_synonyms.json
"""

import argparse
import csv
import json
import re
import sys
from collections import defaultdict
from datetime import datetime
from pathlib import Path
from statistics import mean, median


# ── Constants ────────────────────────────────────────────────────────────────

CATEGORY_SLUG_MAP = {
    "예술":       "art",
    "음악":       "music",
    "영화/비디오": "film",
    "영화비디오":  "film",
    "출판":       "publishing",
    "게임":       "game",
    "기술/디자인": "tech_design",
    "기술디자인":  "tech_design",
    "패션":       "fashion",
    "음식":       "food",
}

REQUIRED_COLUMNS = {
    "project_id", "project_title", "creator_id", "category",
    "subcategory", "launch_date", "end_date", "goal_amount",
    "pledged_amount", "backer_count", "average_pledge", "keywords",
}

REPORT_TIMESTAMP = datetime.now().strftime("%Y-%m-%d %H:%M")


# ── Argument Parsing ─────────────────────────────────────────────────────────

def parse_args():
    parser = argparse.ArgumentParser(description="Tumblbug tag trend report generator")
    parser.add_argument("--input", required=True, help="Path to input CSV or JSON file")
    parser.add_argument("--output", required=True, help="Path to output directory")
    parser.add_argument(
        "--synonyms",
        default=str(Path(__file__).parent.parent / "references" / "tag_synonyms.json"),
        help="Path to tag_synonyms.json",
    )
    return parser.parse_args()


# ── Data Loading ─────────────────────────────────────────────────────────────

def load_data(path: str) -> list:
    p = Path(path)
    if not p.exists():
        print(f"[ERROR] Input file not found: {path}", file=sys.stderr)
        sys.exit(1)

    suffix = p.suffix.lower()
    if suffix == ".csv":
        with open(p, newline="", encoding="utf-8-sig") as f:
            rows = list(csv.DictReader(f))
    elif suffix == ".json":
        with open(p, encoding="utf-8") as f:
            data = json.load(f)
        if isinstance(data, list):
            rows = data
        elif isinstance(data, dict) and "rows" in data:
            rows = data["rows"]
        else:
            print('[ERROR] JSON must be an array or {"rows": [...]}', file=sys.stderr)
            sys.exit(1)
    else:
        print(f"[ERROR] Unsupported file type: {suffix}. Use .csv or .json", file=sys.stderr)
        sys.exit(1)

    if not rows:
        print("[ERROR] Input file contains no data rows.", file=sys.stderr)
        sys.exit(1)

    missing = REQUIRED_COLUMNS - set(rows[0].keys())
    if missing:
        print(f"[ERROR] Missing columns: {', '.join(sorted(missing))}", file=sys.stderr)
        sys.exit(1)

    return rows


def coerce_row(row: dict):
    try:
        return {
            **row,
            "goal_amount":    float(row["goal_amount"] or 0),
            "pledged_amount": float(row["pledged_amount"] or 0),
            "backer_count":   int(float(row["backer_count"] or 0)),
            "average_pledge": float(row["average_pledge"] or 0),
        }
    except (ValueError, TypeError):
        return None


# ── Synonym / Cluster Mapping ─────────────────────────────────────────────────

def load_synonyms(path: str) -> dict:
    p = Path(path)
    if not p.exists():
        print(f"[WARN] Synonym file not found: {path}. Proceeding without clustering.", file=sys.stderr)
        return {}
    with open(p, encoding="utf-8") as f:
        return json.load(f)


def build_reverse_map(synonyms: dict) -> dict:
    reverse = {}
    for cluster, tags in synonyms.items():
        for tag in tags:
            reverse[tag.strip().lower()] = cluster
    return reverse


def extract_clusters(keywords_str: str, reverse_map: dict) -> list:
    if not keywords_str or not keywords_str.strip():
        return []

    clusters_seen = set()
    raw_tags = [t.strip().lower() for t in keywords_str.split(",") if t.strip()]
    for tag in raw_tags:
        if tag in reverse_map:
            clusters_seen.add(reverse_map[tag])
        else:
            clusters_seen.add(f"기타/{tag}")

    return list(clusters_seen)


# ── Metric Calculation ────────────────────────────────────────────────────────

def safe_mean(values: list) -> float:
    return mean(values) if values else 0.0


def safe_median(values: list) -> float:
    return median(values) if values else 0.0


def compute_cluster_metrics(projects: list) -> dict:
    funding_rates = []
    pledged_amounts = []
    backer_counts = []
    pledge_per_backers = []
    funded = 0
    top_project = None
    top_pledged = -1

    for p in projects:
        goal = p["goal_amount"]
        pledged = p["pledged_amount"]
        backers = p["backer_count"]

        rate = (pledged / goal * 100) if goal > 0 else 0.0
        funding_rates.append(rate)
        pledged_amounts.append(pledged)
        backer_counts.append(float(backers))
        if backers > 0:
            pledge_per_backers.append(pledged / backers)
        if pledged >= goal:
            funded += 1
        if pledged > top_pledged:
            top_pledged = pledged
            top_project = p

    n = len(projects)
    return {
        "total_projects":        n,
        "funded_projects":       funded,
        "funding_success_rate":  round(funded / n * 100, 1) if n else 0.0,
        "avg_funding_rate":      round(safe_mean(funding_rates), 1),
        "median_funding_rate":   round(safe_median(funding_rates), 1),
        "avg_pledged":           round(safe_mean(pledged_amounts)),
        "median_pledged":        round(safe_median(pledged_amounts)),
        "avg_backers":           round(safe_mean(backer_counts), 1),
        "avg_pledge_per_backer": round(safe_mean(pledge_per_backers)),
        "top_project":           top_project,
    }


def aggregate_by_cluster(rows: list, reverse_map: dict, category_filter=None) -> dict:
    cluster_projects = defaultdict(list)
    for row in rows:
        if category_filter and row.get("category") != category_filter:
            continue
        clusters = extract_clusters(row.get("keywords", ""), reverse_map)
        if not clusters:
            sub = row.get("subcategory", "").strip()
            clusters = [sub] if sub else ["미분류"]
        for cluster in clusters:
            cluster_projects[cluster].append(row)
    return dict(cluster_projects)


# ── Trend Title ───────────────────────────────────────────────────────────────

def generate_trend_title(top_clusters: list, category: str) -> str:
    if not top_clusters:
        return f"{category} 트렌드 리포트"
    names = [c[0] for c in top_clusters[:3]]
    return f"{category} 트렌드: {'·'.join(names)}의 강세"


# ── Markdown Rendering ────────────────────────────────────────────────────────

def fmt_krw(amount: float) -> str:
    return f"₩{int(amount):,}"


def fmt_pct(value: float) -> str:
    return f"{value:.1f}%"


def render_cluster_table(cluster_metrics: list, max_rows: int = 20) -> str:
    header = (
        "| 순위 | 태그 클러스터 | 프로젝트 수 | 성공률 | 평균 달성률 | 평균 모금액 | 평균 후원자 | 평균 1인당 후원액 |\n"
        "|------|--------------|------------|--------|------------|------------|------------|------------------|\n"
    )
    rows_md = []
    for rank, (cluster, m) in enumerate(cluster_metrics[:max_rows], 1):
        rows_md.append(
            f"| {rank} | {cluster} | {m['total_projects']} | "
            f"{fmt_pct(m['funding_success_rate'])} | "
            f"{fmt_pct(m['avg_funding_rate'])} | "
            f"{fmt_krw(m['avg_pledged'])} | "
            f"{m['avg_backers']:.0f} | "
            f"{fmt_krw(m['avg_pledge_per_backer'])} |"
        )
    return header + "\n".join(rows_md)


def render_insights(cluster_metrics: list, category: str) -> str:
    lines = ["## 인사이트\n"]

    if not cluster_metrics:
        lines.append("- 분석 가능한 클러스터 데이터가 없습니다.\n")
        return "\n".join(lines)

    top = cluster_metrics[0]
    lines.append(
        f"- **{top[0]}** 클러스터가 {category} 카테고리에서 가장 높은 평균 달성률 "
        f"({fmt_pct(top[1]['avg_funding_rate'])})을 기록했습니다."
    )

    outstanding = [(c, m) for c, m in cluster_metrics if m["avg_funding_rate"] >= 200]
    if outstanding:
        names = ", ".join(c for c, _ in outstanding[:3])
        lines.append(f"- **초과 달성 클러스터** (평균 달성률 200% 이상): {names}")

    low_confidence = [(c, m) for c, m in cluster_metrics if m["total_projects"] < 5]
    if low_confidence:
        names = ", ".join(c for c, _ in low_confidence[:5])
        lines.append(f"- 데이터 신뢰도 낮음 (프로젝트 5개 미만): {names} — 해석 시 주의 필요")

    by_backers = sorted(cluster_metrics, key=lambda x: x[1]["avg_backers"], reverse=True)
    if by_backers:
        b_top = by_backers[0]
        lines.append(
            f"- **후원자 참여도 최고**: {b_top[0]} "
            f"(평균 {b_top[1]['avg_backers']:.0f}명/프로젝트)"
        )

    by_pledge = sorted(cluster_metrics, key=lambda x: x[1]["avg_pledge_per_backer"], reverse=True)
    if by_pledge:
        p_top = by_pledge[0]
        lines.append(
            f"- **1인당 후원액 최고**: {p_top[0]} "
            f"(평균 {fmt_krw(p_top[1]['avg_pledge_per_backer'])}/인)"
        )

    return "\n".join(lines) + "\n"


def render_top_project_spotlight(cluster_metrics: list) -> str:
    best = None
    best_pledged = -1
    for _, m in cluster_metrics:
        tp = m.get("top_project")
        if tp and tp["pledged_amount"] > best_pledged:
            best_pledged = tp["pledged_amount"]
            best = tp

    if not best:
        return ""

    rate = (best["pledged_amount"] / best["goal_amount"] * 100) if best["goal_amount"] > 0 else 0
    return (
        "\n## 주목 프로젝트\n\n"
        "| 항목 | 내용 |\n"
        "|------|------|\n"
        f"| 프로젝트명 | {best['project_title']} |\n"
        f"| 카테고리 | {best['category']} / {best['subcategory']} |\n"
        f"| 모금액 | {fmt_krw(best['pledged_amount'])} |\n"
        f"| 달성률 | {fmt_pct(rate)} |\n"
        f"| 후원자 | {int(best['backer_count']):,}명 |\n"
        f"| 기간 | {best['launch_date']} ~ {best['end_date']} |\n\n"
    )


# ── Report Builders ───────────────────────────────────────────────────────────

def build_category_report(category: str, cluster_projects: dict) -> str:
    all_metrics = [
        (cluster, compute_cluster_metrics(projects))
        for cluster, projects in cluster_projects.items()
    ]
    all_metrics.sort(key=lambda x: x[1]["avg_funding_rate"], reverse=True)

    total_projects = sum(m["total_projects"] for _, m in all_metrics)
    title = generate_trend_title(all_metrics, category)

    lines = [
        f"# {title}\n",
        f"> 카테고리: **{category}** | 분석 기준일: {REPORT_TIMESTAMP} | 총 프로젝트: {total_projects:,}개\n",
        "---\n",
        "## 태그 클러스터별 트렌드 순위\n",
        render_cluster_table(all_metrics),
        "\n",
        render_insights(all_metrics, category),
        render_top_project_spotlight(all_metrics),
        "---\n",
        f"*이 리포트는 `analyze.py`에 의해 자동 생성되었습니다. 생성 시각: {REPORT_TIMESTAMP}*\n",
    ]
    return "\n".join(lines)


def build_summary_report(all_rows: list, cluster_projects_global: dict, category_slugs: list) -> str:
    global_metrics = [
        (cluster, compute_cluster_metrics(projects))
        for cluster, projects in cluster_projects_global.items()
    ]
    global_metrics.sort(key=lambda x: x[1]["avg_funding_rate"], reverse=True)

    total_projects = len(all_rows)
    total_funded = sum(
        1 for r in all_rows
        if r["goal_amount"] > 0 and r["pledged_amount"] >= r["goal_amount"]
    )
    overall_success_rate = round(total_funded / total_projects * 100, 1) if total_projects else 0
    all_rates = [
        r["pledged_amount"] / r["goal_amount"] * 100
        for r in all_rows if r["goal_amount"] > 0
    ]
    overall_avg_rate = round(safe_mean(all_rates), 1)

    cat_header = (
        "| 카테고리 | 프로젝트 수 | 성공률 | 평균 달성률 |\n"
        "|----------|------------|--------|------------|\n"
    )
    cat_rows_md = []
    for cat_name, slug in category_slugs:
        cat_rows = [r for r in all_rows if r.get("category") == cat_name]
        if not cat_rows:
            continue
        rates = [r["pledged_amount"] / r["goal_amount"] * 100 for r in cat_rows if r["goal_amount"] > 0]
        funded_count = sum(
            1 for r in cat_rows
            if r["goal_amount"] > 0 and r["pledged_amount"] >= r["goal_amount"]
        )
        success_rate = round(funded_count / len(cat_rows) * 100, 1)
        avg_rate = round(safe_mean(rates), 1)
        cat_rows_md.append(
            f"| [{cat_name}](./{slug}.md) | {len(cat_rows)} | "
            f"{fmt_pct(success_rate)} | {fmt_pct(avg_rate)} |"
        )

    lines = [
        "# Tumblbug 태그 트렌드 종합 리포트\n",
        f"> 분석 기준일: {REPORT_TIMESTAMP} | 총 프로젝트: {total_projects:,}개 | "
        f"전체 성공률: {fmt_pct(overall_success_rate)} | 전체 평균 달성률: {fmt_pct(overall_avg_rate)}\n",
        "---\n",
        "## 카테고리별 요약\n",
        cat_header + "\n".join(cat_rows_md),
        "\n\n---\n",
        "## 전체 Top 태그 클러스터 (달성률 기준)\n",
        render_cluster_table(global_metrics, max_rows=30),
        "\n",
        render_insights(global_metrics, "전체"),
        render_top_project_spotlight(global_metrics),
        "---\n",
        "## 카테고리 리포트 링크\n",
    ]
    for cat_name, slug in category_slugs:
        lines.append(f"- [{cat_name}](./{slug}.md)")
    lines.append(f"\n\n*자동 생성: {REPORT_TIMESTAMP}*\n")

    return "\n".join(lines)


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    args = parse_args()

    raw_rows = load_data(args.input)
    rows = [r for raw in raw_rows if (r := coerce_row(raw)) is not None]
    if not rows:
        print("[ERROR] No valid rows after coercion.", file=sys.stderr)
        sys.exit(1)
    print(f"[INFO] Loaded {len(rows)} rows from {args.input}")

    synonyms = load_synonyms(args.synonyms)
    reverse_map = build_reverse_map(synonyms)
    print(f"[INFO] Loaded {len(synonyms)} tag clusters from synonym dictionary")

    out_dir = Path(args.output)
    out_dir.mkdir(parents=True, exist_ok=True)

    categories = sorted({r["category"] for r in rows if r.get("category")})
    category_slugs = [
        (cat, CATEGORY_SLUG_MAP.get(cat, re.sub(r"[^\w]", "_", cat).lower()))
        for cat in categories
    ]

    for cat_name, slug in category_slugs:
        cluster_projects = aggregate_by_cluster(rows, reverse_map, category_filter=cat_name)
        if not cluster_projects:
            print(f"[WARN] No cluster data for category: {cat_name}, skipping.")
            continue
        report_md = build_category_report(cat_name, cluster_projects)
        out_path = out_dir / f"{slug}.md"
        out_path.write_text(report_md, encoding="utf-8")
        print(f"[INFO] Wrote category report: {out_path}")

    global_clusters = aggregate_by_cluster(rows, reverse_map)
    summary_md = build_summary_report(rows, global_clusters, category_slugs)
    summary_path = out_dir / "summary.md"
    summary_path.write_text(summary_md, encoding="utf-8")
    print(f"[INFO] Wrote summary report: {summary_path}")

    print(f"[DONE] {len(category_slugs) + 1} reports written to {out_dir.resolve()}")


if __name__ == "__main__":
    main()
