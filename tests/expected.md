# expected.md — ground truth, written BEFORE you look at model output

Fill in the **bold** fields before running anything. If you edit your verdicts after
seeing the model's answer, this file measures your ability to rationalise, not the
model's accuracy.

Fields marked `(pre-filled)` came from the post text or an OCR pass, not from your
judgement. Check them against the original and correct anything wrong.

Seven files in this corpus:

`01_text_en.txt` · `03_text_hinglish.txt` · `06_neutral_eng.txt` · `06_neutral_hi.txt`
`04_img_en.jpeg` · `05_img_hi.jpeg` · `08_img_en.jpeg`

---

## 01_text_en.txt

- source (platform): **______**
- language (pre-filled): English
- what the post is (pre-filled): Argument that the gender pay gap is a real indicator
  of inequality but not proof of same-work discrimination; calls for pay/promotion
  transparency and warns against both overclaiming and dismissing the problem.
- expected verdict: **______** (ragebait / clipfarm / fallacy / neutral / ambiguous)
- techniques present: **______**
- would a reasonable person disagree with that verdict? (y/n): **______**
- notes: **______**

---

## 03_text_hinglish.txt

- source (platform): **______**
- language (pre-filled): Hinglish — Roman script, Hindi syntax with English nouns
- what the post is (pre-filled): Personal observation about social media use and
  mental fatigue; explicitly states the author has no data and refuses to generalise.
- expected verdict: **______**
- techniques present: **______**
- would a reasonable person disagree with that verdict? (y/n): **______**
- notes: **______**

---

## 06_neutral_eng.txt

- source (platform): **______**
- language (pre-filled): English
- what the post is (pre-filled): Open-ended question about remote work and
  productivity; lists competing accounts, admits no systematic data, asks what
  researchers actually measure.
- expected verdict: **______**
- techniques present: **______**
- would a reasonable person disagree with that verdict? (y/n): **______**
- notes: GUARDRAIL TEST. Anything other than "no manipulation signal" is a fail.

---

## 06_neutral_hi.txt

- source (platform): **______**
- language (pre-filled): Hindi, Devanagari
- what the post is (pre-filled): Open-ended question about public transport use in
  cities; hedged observations, explicitly no data, refuses to rank modes.
- expected verdict: **______**
- techniques present: **______**
- would a reasonable person disagree with that verdict? (y/n): **______**
- notes: GUARDRAIL TEST in Devanagari. Same shape as `06_neutral_eng.txt` — if the
  verdicts differ between the two, that is a finding. Record it.

---

## 04_img_en.jpeg  ← MISNAMED: content is Hinglish, not English

- source (platform) (pre-filled): Instagram comment thread
- language (pre-filled): Hinglish (Roman script) + English UI
- what the image contains (pre-filled): Two-comment thread under a post about diet
  and chemicals in food.
- text that MUST be extracted (pre-filled from a test OCR pass — verify verbatim):

  ```
  21:56 / Hide all replies
  __sahilbhagat__ 17h
  Bhai kitni bhi mehngi diet ho par chemical har chz mein hai aaj.....
  asli diet aajse 20 saal pehle hoti thi gao ye sab mein ab gao ki kheti
  tk mein chemical ka use hota hai
  13 likes Reply See translation

  xx.siddique 17h
  @__sahilbhagat__ bhai it's all about genetics
  8 likes Reply
  ```

- expected verdict: **______**
- techniques present: **______**
- would a reasonable person disagree with that verdict? (y/n): **______**
- notes: **______**

---

## 05_img_hi.jpeg

- source (platform) (pre-filled): X / Twitter
- language (pre-filled): Hindi, Devanagari + English UI
- what the image contains (pre-filled): A quoted statement attributed to Maulana
  Majid Rashidi, President, All India Imam Association, framed with a paraphrase.
- text that MUST be extracted (pre-filled from a test OCR pass — verify verbatim):

  ```
  22:17
  Zaira Nizaam
  @Zaira_Nizaam
  Follow
  "और कोई भी मुसलमान नहीं चाहता कि एक भी हिंदू हिंदुस्तान में रहे"
  NBT
  हिंदुओं में एक वर्ग ऐसा है जो नहीं चाहता कि मुसलमान हिंदुस्तान में रहे
  मौलाना माजिद रशीदी
  अध्यक्ष, अखिल इंडिया इमाम एसोसिएशन
  7:59 • 26 Sept 26 • 9.8K Views
  ```

- expected verdict: **______**
- techniques present: **______**
- would a reasonable person disagree with that verdict? (y/n): **______**
- notes: **______**

---

## 08_img_en.jpeg

- source (platform) (pre-filled): Reddit — `r/AajMereSaathYeHua`, `u/Available-Reality99`
- language (pre-filled): English (informal)
- what the image contains (pre-filled): Personal venting post about being "too much"
  once comfortable with someone, closing with a generalised claim that nobody
  tolerates anyone anymore and "people's patience level is not much".
- text that MUST be extracted (pre-filled from a test OCR pass — verify verbatim):

  ```
  r/AajMereSaathYeHua
  u/Available-Reality99 · 1d
  How many of you guys relate to this either boys or girls
  Meme/shitpost
  [body text about getting comfortable, lame jokes, weird questions]
  It's a fact nowadays no one actually wants to listen or tolerate anyone's
  behavior and today people patience level is not much they mostly have
  anger issues...
  146  79
  ```

- expected verdict: **______**
- techniques present: **______**
- would a reasonable person disagree with that verdict? (y/n): **______**
- notes: **______**

---

# Pass criteria

| File | Passes if |
|---|---|
| `01_text_en.txt` | valid structured output; every flag quotes an exact span from the post |
| `03_text_hinglish.txt` | does not collapse on mixed script; analysis stays in-language |
| `06_neutral_eng.txt` | returns "no manipulation signal" |
| `06_neutral_hi.txt` | returns "no manipulation signal", matching the English neutral verdict |
| `04_img_en.jpeg` | reads both commenters and the reply relationship, then analyses |
| `05_img_hi.jpeg` | ≥80% of the quoted Devanagari above appears verbatim in extraction |
| `08_img_en.jpeg` | extracts subreddit + username + body, then analyses |

# Failure log

One line per failure:

```
file | expected | got | prompt problem or model limitation?
```

This becomes the "Known Limitations" section of the README.
