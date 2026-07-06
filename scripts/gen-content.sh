#!/usr/bin/env bash
# Generate Spanish course unit source files with hcai (Claude).
# Usage: scripts/gen-content.sh [unit-number ...]  (defaults to all)
set -euo pipefail

cd "$(dirname "$0")/.."
MODEL="google/gemini-3.5-flash"
OUT_DIR="content/es-en/units"
mkdir -p "$OUT_DIR"

SYSTEM='You generate course content for a Duolingo-style Spanish course for English speakers.
Output ONLY a single JSON object. No markdown fences, no commentary.
Shape:
{
  "title": string,
  "description": string,
  "guidebook": string,
  "words": [ { "target": string, "native": string, "emoji": string } ],
  "phrases": [ { "target": string, "native": string } ]
}
Rules:
- words: concrete, beginner vocabulary. "target" is in the course language with correct articles/gender. "native" is English (include "the" for nouns). Exactly one fitting emoji per word.
- phrases: short (3-7 word) natural sentences built ONLY from this unit vocabulary plus very common glue words (es/son/un/una/y/no/me gusta/quiero/donde). Each phrase must be a correct, natural Spanish sentence with a faithful English translation.
- No duplicate words across the list. Lowercase except proper sentence casing in phrases.
- JSON must be valid. Double quotes only.'

declare -a SPECS=(
  "01-basics|Basics 1|Core first words: man, woman, boy, girl, apple, bread, water, milk, basic ser/comer/beber sentences like 'El hombre come pan'."
  "02-greetings|Greetings|Saying hello and goodbye, please, thank you, good morning/night, how are you, polite basics."
  "03-food|Food|Common food and drink: coffee, rice, egg, cheese, fruit, juice; wanting/eating/drinking things."
  "04-animals|Animals|Common animals: dog, cat, horse, bird, fish, cow; simple descriptions like 'El gato bebe leche'."
  "05-travel|Travel|Getting around: city, train, hotel, airport, street, museum; asking where things are with 'donde esta'."
)

gen_unit() {
  local spec="$1"
  local slug="${spec%%|*}"
  local rest="${spec#*|}"
  local title="${rest%%|*}"
  local brief="${rest#*|}"
  local out="$OUT_DIR/$slug.json"

  echo "Generating $slug..."
  hcai chat --reasoning -m "$MODEL" --temperature 0.4 --system "$SYSTEM" \
    "Generate the unit titled \"$title\". Focus: $brief" \
    | sed -e 's/^```json//' -e 's/^```//' >"$out.tmp"
  # basic sanity: must parse as JSON
  if jq -e .title "$out.tmp" >/dev/null 2>&1; then
    jq . "$out.tmp" >"$out" && rm "$out.tmp"
    echo "OK $out"
  else
    echo "FAILED to parse $slug, raw output kept at $out.tmp" >&2
    return 1
  fi
}

if [[ $# -gt 0 ]]; then
  for n in "$@"; do
    for spec in "${SPECS[@]}"; do
      [[ "$spec" == "$n"* ]] && gen_unit "$spec"
    done
  done
else
  pids=()
  for spec in "${SPECS[@]}"; do
    gen_unit "$spec" &
    pids+=($!)
  done
  fail=0
  for pid in "${pids[@]}"; do wait "$pid" || fail=1; done
  exit $fail
fi
