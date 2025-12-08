"""
Pet Parenting Style Prototype (Streamlit)

This script implements a small online prototype of the pet parenting style
questionnaire based on Lauren Brubaker’s 36-item scale.

What it does:
- Shows 36 items (Authoritative, Authoritarian, Permissive; 5-point Likert).
- Computes three scale means for each owner.
- Classifies the owner into the most probable parenting style using
  Lauren-based centroids and bias factors (supervised nearest centroid model).
- Uses normative data from 953 dogs to compute z-scores and percentiles
  for each scale.
- Displays:
    * Most probable parenting style,
    * Raw means,
    * Z-scores and percentiles,
    * A bar chart of percentiles,
    * A donut chart showing model-based style similarity.

How to run locally:
1) Install dependencies:
       pip install streamlit numpy pandas altair
2) From the folder with this file, run:
       streamlit run PPS_1.py
3) Open the URL shown in the terminal (usually http://localhost:8501).

Notes:
- All centroids, bias factors and normative statistics are embedded in the code;
  no external data files are needed at runtime.
- The app does not store responses on an external server; answers live only
  for the current session and are discarded when the page is closed.
"""

import streamlit as st
import numpy as np
import pandas as pd
import altair as alt
import math

# ---------- 1. Scale definitions ---------- #

PERMISSIVE_ITEMS = ["X3", "X10", "X13", "X14", "X34", "X40",
                    "X44", "X61", "X64", "X71", "X72", "X60"]

AUTHORITATIVE_ITEMS = ["X5", "X7", "X19", "X33", "X43", "X47",
                       "X52", "X62", "X65", "X67", "X78", "X80"]

AUTHORITARIAN_ITEMS = ["X4", "X11", "X18", "X24", "X30", "X32",
                       "X35", "X38", "X39", "X48", "X70", "X76"]

STYLE_ORDER = ["Authoritarian", "Authoritative", "Permissive"]

# ---------- 2. Item texts ---------- #

ITEM_TEXTS = {
    # Authoritarian
    "X32": "I reprimand my pet to improve behavior",
    "X30": "I carry out discipline after my pet misbehaves",
    "X76": "If I give a command, I believe my pet should obey me because I said so",
    "X18": "I scold or criticize my pet's behavior if it doesn't meet my expectations",
    "X24": "I employ an \"alpha\" or \"pack leader\" mentality with my pet",
    "X39": "When I teach my pet commands I expect him/her to obey me no matter what",
    "X38": "I use short, quick pulls on the leash, collar, or scruff if my pet pulls when I'm handling it",
    "X4":  "I use a stern, loud voice when my pet misbehaves",
    "X70": "I use physical aids when I train my pet",
    "X48": "I yell or shout when my pet misbehaves",
    "X35": "I demand that my pet does things",
    "X11": "I tell my pet what to do",

    # Authoritative
    "X52": "I think about my pet's feelings",
    "X47": "I spend (or try to spend) a lot of quality time with my pet",
    "X33": "I think about my pet when I'm away from home",
    "X67": "I have warm and fun times with my dog",
    "X65": "I laugh and joke with my pet",
    "X78": "I believe my pet displays human emotions",
    "X80": "If I make a mistake with my pet, I feel bad and try to make it up to him/her",
    "X7":  "I wish I could spend more time with my pet",
    "X19": "I play with my pet",
    "X62": "I celebrate my pet's birthday",
    "X43": "I can recognize individuals that my pet gets along with",
    "X5":  "I show patience with my pet",

    # Permissive
    "X44": "I ignore my pet when it chews or steals something it's not supposed to",
    "X71": "I am unsure about how to handle my pet's misbehavior",
    "X13": "I worry about being too harsh when correcting my pet's misbehavior",
    "X40": "I give into my dog when he/she causes a commotion about something",
    "X14": "I am afraid that disciplining my pet for misbehavior will cause him to like me less",
    "X72": "I give into my pet when my pet is stubborn",
    "X64": "I think about punishing my pet but don't actually do it",
    "X3":  "I allow my pet to annoy other animals",
    "X61": "I worry about how my pet feels about me, especially whether my pet likes me or not",
    "X10": "I worry that I will overly restrict my pet if I am too demanding",
    "X34": "If I have guests over and my pet misbehaves, I refrain from correcting it",
    "X60": "I spoil my pet",
}

# ---------- 3. Lauren's centroids & bias ---------- #

# Each centroid = [Permissive, Authoritative, Authoritarian]
CENTROIDS = {
    "Authoritarian": np.array([1.864583, 4.083333, 3.156250]),
    "Authoritative": np.array([2.125000, 4.387821, 2.285256]),
    "Permissive":    np.array([2.645833, 3.802083, 2.458333]),
}

BETA_PERM = 1.205
BETA_AUTHV = 1.000
BETA_AUTHN = 1.325

# ---------- 4. Norms for z-scores (953 dogs) ---------- #

MEAN_PERM = 2.093652
SD_PERM   = 0.516713

MEAN_AUTHV = 4.245453
SD_AUTHV   = 0.530544

MEAN_AUTHN = 2.533141
SD_AUTHN   = 0.730939

def z_to_percentile(z: float) -> float:
    """Convert z-score to percentile (0-100) assuming normal distribution."""
    cdf = 0.5 * (1.0 + math.erf(z / math.sqrt(2.0)))
    return 100.0 * cdf


# ---------- 5. Streamlit UI ---------- #

st.title("Pet Parenting Style Prototype")

st.write(
    "Please rate how often you engage in each of the following behaviors "
    "with your dog. Be as honest as possible in your responses, and feel "
    "free to use the full range of the scale provided. There are 36 "
    "questions in total."
)

likert_labels = [
    "Never",
    "Once in a while",
    "About half the time",
    "Very often",
    "Always",
]

responses = {}

# порядок по номеру X
ITEM_LIST = sorted(ITEM_TEXTS.keys(), key=lambda x: int(x[1:]))

for item in ITEM_LIST:
    label = f"{item}. {ITEM_TEXTS[item]}"
    # index=None -> ничего не выбрано по умолчанию
    choice = st.radio(label, likert_labels, index=None, key=item)
    responses[item] = choice  # может быть None, если не выбрано

if st.button("Compute Style"):
    # проверяем, что все вопросы отвечены
    if any(v is None for v in responses.values()):
        st.error("Please answer all 36 questions before computing your profile.")
    else:
        # переводим ответы в 1–5
        def mean_for(items):
            vals = [likert_labels.index(responses[i]) + 1 for i in items]
            return float(np.mean(vals))

        # raw means
        S_perm  = mean_for(PERMISSIVE_ITEMS)
        S_authv = mean_for(AUTHORITATIVE_ITEMS)
        S_authn = mean_for(AUTHORITARIAN_ITEMS)

        profile = np.array([S_perm, S_authv, S_authn])  # [Perm, Authv, Authn]

        # distances to centroids
        dists = {}
        for style in STYLE_ORDER:
            centroid = CENTROIDS[style]
            dists[style] = np.linalg.norm(profile - centroid)

        # apply bias factors
        eff_dists = {
            "Permissive":    BETA_PERM  * dists["Permissive"],
            "Authoritative": BETA_AUTHV * dists["Authoritative"],
            "Authoritarian": BETA_AUTHN * dists["Authoritarian"],
        }

        final_style = min(eff_dists, key=eff_dists.get)

        # z-scores (953 dogs)
        z_perm  = (S_perm  - MEAN_PERM)  / SD_PERM
        z_authv = (S_authv - MEAN_AUTHV) / SD_AUTHV
        z_authn = (S_authn - MEAN_AUTHN) / SD_AUTHN

        # percentiles
        p_perm  = z_to_percentile(z_perm)
        p_authv = z_to_percentile(z_authv)
        p_authn = z_to_percentile(z_authn)

        st.subheader(f"Most probable parenting style: **{final_style}**")

        st.markdown("**Raw scale means (1–5):**")
        st.write(f"- Permissive: {S_perm:.2f}")
        st.write(f"- Authoritative: {S_authv:.2f}")
        st.write(f"- Authoritarian: {S_authn:.2f}")

        st.markdown("**Z-scores and percentiles (vs. 953-dog sample):**")
        st.write(
            f"- Permissive: z = {z_perm:.2f}, percentile ≈ {p_perm:.0f}th"
        )
        st.write(
            f"- Authoritative: z = {z_authv:.2f}, percentile ≈ {p_authv:.0f}th"
        )
        st.write(
            f"- Authoritarian: z = {z_authn:.2f}, percentile ≈ {p_authn:.0f}th"
        )

        # ---------- 6. Графики: левая/правая колонка ---------- #

        col_left, col_right = st.columns(2)

        # ------- LEFT: Normative percentile profile ------- #
        df_pct = pd.DataFrame({
            "Style": ["Authoritarian", "Authoritative", "Permissive"],
            "Percentile": [p_authn, p_authv, p_perm],
        })

        color_scale = alt.Scale(
            domain=["Authoritarian", "Authoritative", "Permissive"],
            range=["#FF4B4B", "#2ECC71", "#F1C40F"],  # red, green, yellow
        )

        bar_pct = (
            alt.Chart(df_pct)
            .mark_bar()
            .encode(
                x=alt.X("Style:N", sort=STYLE_ORDER),
                y=alt.Y("Percentile:Q", scale=alt.Scale(domain=[0, 100])),
                color=alt.Color("Style:N", scale=color_scale, legend=None),
                tooltip=[
                    "Style",
                    alt.Tooltip("Percentile:Q", format=".0f"),
                ],
            )
        )

        with col_left:
            st.markdown("**Normative profile (percentiles):**")
            st.altair_chart(bar_pct, use_container_width=True)

        # ------- RIGHT: model-based similarity (donut) ------- #
        # чем меньше effective distance, тем больше similarity
        sim_scores = {
            style: float(np.exp(-eff_dists[style]))
            for style in STYLE_ORDER
        }

        df_sim = pd.DataFrame({
            "Style": list(sim_scores.keys()),
            "Similarity": list(sim_scores.values()),
        })

        donut = (
            alt.Chart(df_sim)
            .mark_arc(innerRadius=50)
            .encode(
                theta="Similarity:Q",
                color=alt.Color("Style:N", scale=color_scale),
                tooltip=[
                    "Style",
                    alt.Tooltip("Similarity:Q", format=".3f"),
                ],
            )
        )

        with col_right:
            st.markdown("**Model-based parenting style:**")
            st.altair_chart(donut, use_container_width=True)
