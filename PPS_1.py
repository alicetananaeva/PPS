import streamlit as st
import numpy as np
import pandas as pd
import altair as alt

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

        profile = np.array([S_perm, S_authv, S_authn])

        # distances to centroids
        dists = {}
        for style in STYLE_ORDER:
            centroid = CENTROIDS[style]
            dists[style] = np.linalg.norm(profile - centroid)

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

        st.subheader(f"Most probable parenting style: **{final_style}**")

        st.markdown("**Raw scale means:**")
        st.write(f"- Permissive: {S_perm:.2f}")
        st.write(f"- Authoritative: {S_authv:.2f}")
        st.write(f"- Authoritarian: {S_authn:.2f}")

        st.markdown("**Z-scores (relative to 953-dog normative sample):**")
        st.write(f"- Permissive z: {z_perm:.2f}")
        st.write(f"- Authoritative z: {z_authv:.2f}")
        st.write(f"- Authoritarian z: {z_authn:.2f}")

        # ------- Z-score bar chart with mean line ------- #
        df_z = pd.DataFrame({
            "Style": ["Authoritarian", "Authoritative", "Permissive"],
            "Z":     [z_authn, z_authv, z_perm],
        })

        color_scale = alt.Scale(
            domain=["Authoritarian", "Authoritative", "Permissive"],
            range=["#FF4B4B", "#2ECC71", "#F1C40F"],  # red, green, yellow
        )

        bar_z = (
            alt.Chart(df_z)
            .mark_bar()
            .encode(
                x=alt.X("Style:N", sort=STYLE_ORDER),
                y=alt.Y("Z:Q", scale=alt.Scale(domain=[-3, 3])),
                color=alt.Color("Style:N", scale=color_scale, legend=None),
                tooltip=["Style", "Z"],
            )
        )

        zero_line = (
            alt.Chart(pd.DataFrame({"y": [0]}))
            .mark_rule(strokeDash=[4, 4])
            .encode(y="y:Q")
        )

        st.markdown("**Profile (z-scores):**")
        st.altair_chart(bar_z + zero_line, use_container_width=True)

        # ------- Donut chart for relative raw means ------- #
        df_raw = pd.DataFrame({
            "Style": ["Authoritarian", "Authoritative", "Permissive"],
            "Score": [S_authn, S_authv, S_perm],
        })

        donut = (
            alt.Chart(df_raw)
            .mark_arc(innerRadius=50)
            .encode(
                theta="Score:Q",
                color=alt.Color("Style:N", scale=color_scale),
                tooltip=["Style", "Score"],
            )
        )

        st.markdown("**Relative style profile (donut chart, raw means):**")
        st.altair_chart(donut, use_container_width=True)
