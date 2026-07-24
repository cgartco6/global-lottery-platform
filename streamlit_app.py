import streamlit as st
import requests
import pandas as pd

st.set_page_config(
    page_title="Nexus Lottery AI - Streamlit Dashboard",
    page_icon="◈",
    layout="wide"
)

# Custom Matte Black & Gold CSS
st.markdown("""
    <style>
    .stApp { background-color: #0B0B0C; color: #EDEDED; }
    h1, h2, h3 { color: #D4AF37 !important; font-family: 'Cinzel', serif; }
    </style>
""", unsafe_allow_html=True)

st.title("◈ NEXUS LOTTO AI | Streamlit Analytics")

API_URL = st.sidebar.text_input("Backend API Base URL", "https://global-lottery-backend.onrender.com")

@st.cache_data(ttl=300)
def fetch_lotteries():
    try:
        response = requests.get(f"{API_URL}/api/lotteries")
        return response.json()
    except Exception as e:
        st.error(f"Failed to connect to API: {e}")
        return []

lotteries = fetch_lotteries()

if lotteries:
    lottery_names = {l['name']: l['id'] for l in lotteries}
    selected_name = st.sidebar.selectbox("Select Lottery", list(lottery_names.keys()))
    selected_id = lottery_names[selected_name]

    # Fetch Analytics
    analytics_res = requests.get(f"{API_URL}/api/lottery/{selected_id}/analytics").json()

    col1, col2 = st.columns([1, 2])

    with col1:
        st.subheader("Probabilistic Prediction")
        st.write("### Predicted Winning Ball Set:")
        st.success(", ".join(map(str, analytics_res['predictions']['mostLikely'])))

        st.metric("Even/Odd Ratio", analytics_res['trends']['evenOddRatio'])
        st.metric("Average Sum", analytics_res['trends']['averageSum'])

    with col2:
        st.subheader("Number Frequency Heatmap")
        heatmap_df = pd.DataFrame(analytics_res['heatmap']['matrix'])
        st.bar_chart(heatmap_df.set_index('number')['intensityPercent'])
