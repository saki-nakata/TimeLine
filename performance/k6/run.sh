#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RESULTS_DIR="${SCRIPT_DIR}/results"
mkdir -p "$RESULTS_DIR"

TEST_TYPE="${1:-load}"

case "$TEST_TYPE" in
  smoke)
    SIMULATIONS=(
      "${SCRIPT_DIR}/simulations/smoke/smokeTest.ts"
    )
    ;;
  load)
    SIMULATIONS=(
      "${SCRIPT_DIR}/simulations/load/loadTest.ts"
    )
    ;;
  stress)
    SIMULATIONS=(
      "${SCRIPT_DIR}/simulations/stress/stressTest.ts"
    )
    ;;
  spike)
    SIMULATIONS=(
      "${SCRIPT_DIR}/simulations/spike/spikeTest.ts"
    )
    ;;
  seed)
    echo "=== シードデータ投入（既存データを削除して再投入） ==="
    SEED_SQL="${SCRIPT_DIR}/../../backend/src/main/resources/db/migration/V10__perf_seed_data_v2.sql"
    docker exec -i timeline-db psql -U postgres -d timeline < "$SEED_SQL"
    echo "完了: シードデータを投入しました（ユーザー100名・投稿10,000件・いいね20,000件・コメント5,000件）"
    exit 0
    ;;
  cleanup)
    echo "=== シードデータのクリーンアップ ==="
    docker exec timeline-db psql -U postgres -d timeline -c \
      "DELETE FROM users WHERE username LIKE 'perf_user_%';"
    echo "完了: perf_user_* ユーザーおよび関連データを削除しました"
    exit 0
    ;;
  index)
    echo "=== 集約レポートHTML生成 ==="
    INDEX_FILE="${RESULTS_DIR}/index.html"
    GENERATED_AT="$(date '+%Y-%m-%d %H:%M:%S')"

    generate_panel() {
      local TYPE="$1"
      local ACTIVE="${2:-}"
      local ACTIVE_CLASS=""
      [ -n "$ACTIVE" ] && ACTIVE_CLASS=" active"

      echo "<div id=\"panel-${TYPE}\" class=\"panel${ACTIVE_CLASS}\">"

      local LATEST_JSON
      LATEST_JSON=$(ls "${RESULTS_DIR}"/*-${TYPE}-*.json 2>/dev/null | sort -r | head -1 || true)
      if [ -z "$LATEST_JSON" ]; then
        echo "<p style='color:#999;padding:24px'>データがありません。テストを実行してください。</p>"
        echo "</div>"
        return
      fi

      local SCENARIO PASSED REQUESTS RPS AVG P95 P99 ERR MAXVUS TIMESTAMP
      SCENARIO=$(grep '"scenario"' "$LATEST_JSON" | sed 's/.*: "\(.*\)".*/\1/')
      PASSED=$(grep '"passed"'    "$LATEST_JSON" | sed 's/.*: //; s/[, ]*$//')
      REQUESTS=$(grep '"requests"' "$LATEST_JSON" | sed 's/.*: //; s/[, ]*$//')
      RPS=$(grep '"rps"'          "$LATEST_JSON" | sed 's/.*: //; s/[, ]*$//')
      AVG=$(grep '"avg"'          "$LATEST_JSON" | sed 's/.*: //; s/[, ]*$//')
      P95=$(grep '"p95"'          "$LATEST_JSON" | sed 's/.*: //; s/[, ]*$//')
      P99=$(grep '"p99"'          "$LATEST_JSON" | sed 's/.*: //; s/[, ]*$//')
      ERR=$(grep '"errorRate"'    "$LATEST_JSON" | sed 's/.*: //; s/[, ]*$//')
      MAXVUS=$(grep '"maxVUs"'    "$LATEST_JSON" | sed 's/.*: //; s/[, }]*$//')
      TIMESTAMP=$(grep '"timestamp"' "$LATEST_JSON" | sed 's/.*: "\(.*\)".*/\1/')

      local BADGE="badge-info" BADGE_TEXT="N/A"
      [ "$PASSED" = "true" ]  && BADGE="badge-pass" && BADGE_TEXT="PASS"
      [ "$PASSED" = "false" ] && BADGE="badge-fail" && BADGE_TEXT="FAIL"

      local ERR_PCT P95_COLOR ERR_COLOR
      ERR_PCT=$(awk "BEGIN{printf \"%.2f\", ${ERR:-0}*100}")
      P95_COLOR=$(awk "BEGIN{ v=${P95:-0}; if(v<500) print \"good\"; else if(v<1000) print \"warn\"; else print \"bad\" }")
      ERR_COLOR=$(awk "BEGIN{ v=${ERR:-0}; if(v<0.01) print \"good\"; else if(v<0.05) print \"warn\"; else print \"bad\" }")

      echo "  <div style='display:flex;align-items:center;justify-content:space-between;margin-bottom:16px'>"
      echo "    <div><div class='section-label'>${TYPE} テスト — 最新結果</div>"
      echo "    <div style='font-size:1.1rem;font-weight:700;color:#2d3748'>${SCENARIO} &nbsp;<span class='badge ${BADGE}'>${BADGE_TEXT}</span></div>"
      echo "    <div style='font-size:.78rem;color:#999;margin-top:4px'>${TIMESTAMP}</div></div>"
      echo "  </div>"

      echo "  <div class='summary-cards'>"
      echo "    <div class='scard'><div class='label'>Total Requests</div><div class='value'>${REQUESTS}</div></div>"
      echo "    <div class='scard'><div class='label'>Throughput</div><div class='value'>$(printf '%.1f' "${RPS:-0}")</div><div class='unit'>req/s</div></div>"
      echo "    <div class='scard'><div class='label'>Avg</div><div class='value'>$(printf '%.0f' "${AVG:-0}")</div><div class='unit'>ms</div></div>"
      echo "    <div class='scard ${P95_COLOR}'><div class='label'>p95</div><div class='value'>$(printf '%.0f' "${P95:-0}")</div><div class='unit'>ms</div></div>"
      echo "    <div class='scard'><div class='label'>p99</div><div class='value'>$(printf '%.0f' "${P99:-0}")</div><div class='unit'>ms</div></div>"
      echo "    <div class='scard ${ERR_COLOR}'><div class='label'>Error Rate</div><div class='value'>${ERR_PCT}</div><div class='unit'>%</div></div>"
      echo "    <div class='scard'><div class='label'>Max VUs</div><div class='value'>${MAXVUS}</div></div>"
      echo "  </div>"

      local ALL_JSONS
      ALL_JSONS=$(ls "${RESULTS_DIR}"/*-${TYPE}-*.json 2>/dev/null | sort -r | head -20 || true)
      if [ -n "$ALL_JSONS" ]; then
        echo "  <div class='section-label' style='margin-bottom:8px'>全シナリオ結果一覧（最新20件）</div>"
        echo "  <table class='results-table'>"
        echo "    <thead><tr><th>シナリオ</th><th>結果</th><th>Requests</th><th>p95 (ms)</th><th>p99 (ms)</th><th>Error %</th><th>Max VUs</th><th>詳細</th></tr></thead>"
        echo "    <tbody>"
        while IFS= read -r jf; do
          S=$(grep '"scenario"' "$jf" | sed 's/.*: "\(.*\)".*/\1/')
          P=$(grep '"passed"'    "$jf" | sed 's/.*: //; s/[, ]*$//')
          R=$(grep '"requests"'  "$jf" | sed 's/.*: //; s/[, ]*$//')
          P9=$(grep '"p95"'      "$jf" | sed 's/.*: //; s/[, ]*$//')
          P99V=$(grep '"p99"'    "$jf" | sed 's/.*: //; s/[, ]*$//')
          E=$(grep '"errorRate"' "$jf" | sed 's/.*: //; s/[, ]*$//')
          MV=$(grep '"maxVUs"'   "$jf" | sed 's/.*: //; s/[, }]*$//')
          EPCT=$(awk "BEGIN{printf \"%.2f\", ${E:-0}*100}")
          BDG="badge-info"; BT="N/A"
          [ "$P" = "true" ]  && BDG="badge-pass" && BT="PASS"
          [ "$P" = "false" ] && BDG="badge-fail" && BT="FAIL"
          HTML_FILE="$(basename "$jf" .json).html"
          echo "      <tr><td>${S}</td><td><span class='badge ${BDG}'>${BT}</span></td><td>${R}</td><td>$(printf '%.0f' "${P9:-0}")</td><td>$(printf '%.0f' "${P99V:-0}")</td><td>${EPCT}%</td><td>${MV}</td><td><a class='link-btn' href='${HTML_FILE}'>詳細</a></td></tr>"
        done <<< "$ALL_JSONS"
        echo "    </tbody></table>"
      fi
      echo "</div>"
    }

    {
      echo '<!DOCTYPE html>'
      echo '<html lang="ja">'
      echo '<head>'
      echo '  <meta charset="UTF-8">'
      echo '  <meta name="viewport" content="width=device-width, initial-scale=1.0">'
      echo '  <title>k6 パフォーマンステスト 集約レポート</title>'
      cat << 'CSS'
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f0f2f5;color:#333}
    header{background:linear-gradient(135deg,#1a1a2e 0%,#16213e 100%);color:#fff;padding:32px 40px}
    header h1{font-size:1.8rem;font-weight:700;margin-bottom:6px}
    header p{opacity:.7;font-size:.9rem}
    main{max-width:1200px;margin:32px auto;padding:0 24px}
    .tabs{display:flex;gap:8px;margin-bottom:24px;flex-wrap:wrap}
    .tab{padding:8px 20px;border-radius:20px;border:none;cursor:pointer;font-size:.85rem;font-weight:600;background:#fff;color:#666;box-shadow:0 1px 3px rgba(0,0,0,.1);transition:.2s}
    .tab.active{color:#fff}
    .tab-smoke.active{background:#2e7d32}.tab-load.active{background:#1565c0}
    .tab-stress.active{background:#e65100}.tab-spike.active{background:#880e4f}
    .panel{display:none}.panel.active{display:block}
    .summary-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:12px;margin-bottom:24px}
    .scard{background:#fff;border-radius:10px;padding:16px;box-shadow:0 1px 4px rgba(0,0,0,.08);border-top:3px solid #e2e8f0}
    .scard.good{border-top-color:#48bb78}.scard.warn{border-top-color:#ed8936}.scard.bad{border-top-color:#fc8181}
    .scard .label{font-size:.7rem;color:#718096;text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px}
    .scard .value{font-size:1.6rem;font-weight:700;color:#2d3748;line-height:1}
    .scard.good .value{color:#276749}.scard.warn .value{color:#c05621}.scard.bad .value{color:#c53030}
    .scard .unit{font-size:.75rem;color:#a0aec0;margin-top:2px}
    .results-table{width:100%;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08);border-collapse:collapse;margin-bottom:24px}
    .results-table th{background:#edf2f7;padding:10px 14px;text-align:left;font-size:.75rem;text-transform:uppercase;letter-spacing:.05em;color:#718096}
    .results-table td{padding:10px 14px;font-size:.85rem;border-top:1px solid #edf2f7}
    .results-table tr:hover td{background:#f7fafc}
    .badge{display:inline-block;padding:2px 10px;border-radius:12px;font-size:.72rem;font-weight:700}
    .badge-pass{background:#c6f6d5;color:#22543d}.badge-fail{background:#fed7d7;color:#742a2a}.badge-info{background:#bee3f8;color:#2a4365}
    .section-label{font-size:.8rem;font-weight:600;color:#999;text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px}
    .link-btn{font-size:.75rem;padding:4px 12px;border-radius:8px;background:#edf2f7;color:#4a5568;text-decoration:none}
    .link-btn:hover{background:#e2e8f0}
    footer{text-align:center;padding:24px;color:#aaa;font-size:.8rem}
  </style>
CSS
      echo '</head>'
      echo '<body>'
      echo '<header>'
      echo '  <h1>k6 パフォーマンステスト 集約レポート</h1>'
      echo "  <p>生成日時: ${GENERATED_AT}</p>"
      echo '</header>'
      echo '<main>'
      echo '<div class="tabs">'
      _FIRST=1
      for TYPE in smoke load stress spike; do
        LABEL=""; ACTIVE_CLS=""
        case "$TYPE" in smoke) LABEL="Smoke";; load) LABEL="Load";; stress) LABEL="Stress";; spike) LABEL="Spike";; esac
        [ $_FIRST -eq 1 ] && ACTIVE_CLS=" active" && _FIRST=0
        echo "  <button class=\"tab tab-${TYPE}${ACTIVE_CLS}\" onclick=\"switchTab('${TYPE}')\">${LABEL}</button>"
      done
      echo '</div>'

      generate_panel smoke active
      generate_panel load
      generate_panel stress
      generate_panel spike

      echo '</main>'
      echo '<footer>TimeLine SNS — k6 Performance Test Reports</footer>'
      echo '<script>'
      echo 'function switchTab(type) {'
      echo '  document.querySelectorAll(".panel").forEach(p => p.classList.remove("active"));'
      echo '  document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));'
      echo '  document.getElementById("panel-" + type).classList.add("active");'
      echo '  document.querySelector(".tab-" + type).classList.add("active");'
      echo '}'
      echo '</script>'
      echo '</body>'
      echo '</html>'
    } > "$INDEX_FILE"

    echo "集約レポート生成完了: ${INDEX_FILE}"
    exit 0
    ;;
  *)
    echo "Usage: $0 [smoke|load|stress|spike|seed|cleanup|index]"
    exit 1
    ;;
esac

echo "=== k6 パフォーマンステスト開始: ${TEST_TYPE} ==="
echo "レポート出力先: ${RESULTS_DIR}"
echo ""

for sim in "${SIMULATIONS[@]}"; do
  echo "▶ 実行中: $(basename "$sim")"
  K6_RESULTS_DIR="$RESULTS_DIR" k6 run "$sim" || true
  echo ""
done

echo "=== 完了 ==="
echo "レポートは ${RESULTS_DIR} に保存されました"
echo ""
echo "=== シードデータのクリーンアップ ==="
docker exec timeline-db psql -U postgres -d timeline -c \
  "DELETE FROM users WHERE username LIKE 'perf_user_%';"
echo "完了: perf_user_* ユーザーおよび関連データを削除しました"
