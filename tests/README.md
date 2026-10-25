# Test corpus

Seven real posts, used to check that Subtext does what it claims and to produce
the repeated-run evidence in the main README.

Nothing here is synthetic. Every text post was written by a person on a real
platform, and every screenshot is a real screenshot.

## Inputs

| File | Language | Kind | What it is |
|---|---|---|---|
| `01_text_en.txt` | English | text | Gender pay gap argument. Hedged, admits it has no data. |
| `03_text_hinglish.txt` | Hinglish | text | Observations about social media behaviour. Conversational. |
| `06_neutral_eng.txt` | English | text | Remote work. Measured, low-claim. |
| `06_neutral_hi.txt` | Devanagari | text | Public transport. Measured, low-claim. |
| `04_img_en.jpeg` | Hinglish | image | Instagram comment thread. **Filename says `en`, content is Hinglish** — renamable, left as-is so past runs stay comparable. |
| `05_img_hi.jpeg` | Devanagari | image | X post quoting a religious figure. Politically charged. |
| `08_img_en.jpeg` | English | image | Reddit r/AajMereSaathYeHua post. |

## Ground truth

`expected.md` holds the human labels. It is written in terms of **observable
structure** — what a reader can point at in the text — never author intent.
Intent cannot be observed, so it is not a gradeable claim.

The six verdicts a run may return are fixed by the system prompt:

```
Strong argument
Reasonable but limited
Weakly supported
Contains a clearly identified logical fallacy
Insufficient information to judge
No substantive argument to evaluate
```

Grading is two-dimensional:

- **Consistency** — does the same post get the same verdict across 3 runs at
  temperature 0.2?
- **Accuracy** — does that verdict match the human label?

A run only counts if it finished. Ollama returns `done_reason: "length"` when
the output is truncated, which produces a report that looks complete and is not.
`run_all.py` retries once at a larger context window and reports the done reason
either way.

## Known weakness of this corpus

Four of the four text posts are hedged and reasonable. A model that always
answers *"no manipulation signal"* would score 100% on the text corpus. The only
genuinely charged input is `05_img_hi.jpeg`.

Read any accuracy number with that in mind. It is stated in the main README's
limitations rather than hidden.

## Running the corpus

The CLI runner talks to Ollama directly and does not need the web app:

```bash
python tests/run_all.py --list
python tests/run_all.py --only 01
python tests/run_all.py --only 01 --runs 3
```

Results land in `tests/results/` as one `.md` and one `.json` per run, plus a
`summary.md` table.
