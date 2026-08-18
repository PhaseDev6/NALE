INTERVENTIONS = {
    "dyslexia": ["tier1_spacing", "tier2_font_ruler", "tier3_break_prompt"],
    "adhd": ["tier1_focus_highlight", "tier2_chunk_content", "tier3_break_prompt"],
    "anxiety": ["tier1_reduce_noise", "tier2_hide_timers", "tier3_break_prompt"],
    "default": ["tier1_spacing", "tier2_font_ruler", "tier3_break_prompt"],
}

def select_intervention(disorder_profile: str, friction_score: float) -> str:
    profile = disorder_profile.lower() if disorder_profile else "default"
    tiers = INTERVENTIONS.get(profile, INTERVENTIONS["default"])
    
    if friction_score > 0.8:
        return tiers[2]
    if friction_score > 0.6:
        return tiers[1]
    return tiers[0]
