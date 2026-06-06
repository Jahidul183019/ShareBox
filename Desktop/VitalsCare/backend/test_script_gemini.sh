BASE="https://health-risk-radar.onrender.com"
PASS=0
FAIL=0

echo "=================================="
echo "  VitalsCare API Test (Gemini)"
echo "=================================="

echo ""
echo "TEST 1: Health Check..."
RESPONSE=$(curl -s "$BASE/health")
echo "$RESPONSE"
if echo "$RESPONSE" | grep -q "Running"; then
    echo "PASS"; PASS=$((PASS+1))
else
    echo "FAIL"; FAIL=$((FAIL+1))
fi

echo ""
echo "TEST 2: Gemini Connected..."
if echo "$RESPONSE" | grep -q "connected"; then
    echo "PASS"; PASS=$((PASS+1))
else
    echo "FAIL - Add GEMINI_API_KEY to Render Environment Variables"; FAIL=$((FAIL+1))
fi

echo ""
echo "TEST 3: WHO Scrape Status..."
SCRAPE=$(curl -s "$BASE/scrape/status")
echo "$SCRAPE"
if echo "$SCRAPE" | grep -q "success"; then
    echo "PASS"; PASS=$((PASS+1))
else
    echo "FAIL"; FAIL=$((FAIL+1))
fi

echo ""
echo "TEST 4: Full AI Pipeline..."
ASSESS=$(curl -s -X POST "$BASE/assess" \
  -H "Content-Type: application/json" \
  -d '{
    "age": 55, "systolic_bp": 150, "diastolic_bp": 95,
    "bmi": 28.5, "family_history": true,
    "activity_level": "low", "diet_quality": "poor",
    "salt_intake": "high", "stress_level": "high",
    "smoking": true, "dietary_diversity": 3,
    "income_level": "low", "children_under5": 3,
    "lang": "en"
  }')
echo "${ASSESS:0:150}..."
if echo "$ASSESS" | grep -q "success"; then
    echo "PASS"; PASS=$((PASS+1))
else
    echo "FAIL"; FAIL=$((FAIL+1))
fi

echo ""
echo "TEST 5: XGBoost Scores..."
if echo "$ASSESS" | grep -q "probability"; then
    echo "PASS"; PASS=$((PASS+1))
else
    echo "FAIL"; FAIL=$((FAIL+1))
fi

echo ""
echo "TEST 6: RAG Working..."
if echo "$ASSESS" | grep -q "who_data_rag"; then
    echo "PASS"; PASS=$((PASS+1))
else
    echo "FAIL"; FAIL=$((FAIL+1))
fi

echo ""
echo "TEST 7: Knowledge Graph..."
if echo "$ASSESS" | grep -q "insights"; then
    echo "PASS"; PASS=$((PASS+1))
else
    echo "FAIL"; FAIL=$((FAIL+1))
fi

echo ""
echo "TEST 8: AI Advice..."
if echo "$ASSESS" | grep -q "ai_advice"; then
    echo "PASS"; PASS=$((PASS+1))
else
    echo "FAIL"; FAIL=$((FAIL+1))
fi

echo ""
echo "TEST 9: Bengali..."
BENGALI=$(curl -s -X POST "$BASE/assess" \
  -H "Content-Type: application/json" \
  -d '{
    "age": 45, "systolic_bp": 145, "diastolic_bp": 92,
    "bmi": 27, "family_history": true,
    "activity_level": "low", "diet_quality": "poor",
    "salt_intake": "high", "stress_level": "medium",
    "smoking": false, "dietary_diversity": 3,
    "income_level": "low", "children_under5": 3,
    "lang": "bn"
  }')
echo "${BENGALI:0:150}..."
if echo "$BENGALI" | grep -q "success"; then
    echo "PASS"; PASS=$((PASS+1))
else
    echo "FAIL"; FAIL=$((FAIL+1))
fi

echo ""
echo "TEST 10: Low Risk..."
LOW=$(curl -s -X POST "$BASE/assess" \
  -H "Content-Type: application/json" \
  -d '{
    "age": 25, "systolic_bp": 110, "diastolic_bp": 70,
    "bmi": 21, "family_history": false,
    "activity_level": "high", "diet_quality": "good",
    "salt_intake": "low", "stress_level": "low",
    "smoking": false, "dietary_diversity": 8,
    "income_level": "medium", "children_under5": 0,
    "lang": "en"
  }')
if echo "$LOW" | grep -q "low\|Low"; then
    echo "PASS"; PASS=$((PASS+1))
else
    echo "FAIL"; FAIL=$((FAIL+1))
fi

echo ""
echo "=================================="
echo "  RESULTS: $PASS/10 PASSED"
if [ $FAIL -eq 0 ]; then
    echo "PERFECT - Ready for judges!"
elif [ $FAIL -le 2 ]; then
    echo "Fix $FAIL tests before June 12"
else
    echo "$FAIL tests need fixing"
fi
echo "=================================="
