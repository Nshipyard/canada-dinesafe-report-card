"""DineSafe chain report card: data pipeline.
Reads the Toronto Open Data DineSafe CSV (one row per inspection/infraction line),
builds inspections, resolves chain identities with a reviewed anchor map, and
emits the ranked chain table + match table + per-chain locations.

Usage: python3 scripts/build_data.py [raw_csv] [out_dir]
"""
import csv, json, re, sys
from collections import Counter, defaultdict
from datetime import date, timedelta

LEGAL_SUFFIX = {"INC", "LTD", "CORP", "LIMITED", "CO", "COMPANY", "LLC", "LP", "L L C"}
LOC_WORDS = {"STORE", "STORES", "NO", "NUMBER", "NUM", "UNIT", "SUITE", "STE", "SHOP", "SHOPS",
             "LOCATION", "LOCATIONS", "KIOSK", "BOOTH", "BAY", "SITE", "BRANCH", "OUTLET", "EXPRESS"}

def normalize(name):
    n = name.upper().replace("&", " AND ")
    n = re.sub(r"[^A-Z0-9 ]", " ", n)
    n = re.sub(r"\s+", " ", n).strip()
    toks = []
    for t in n.split():
        if re.fullmatch(r"#?\d+", t):
            # keep digits that are part of the brand (241 PIZZA, 7 ELEVEN handled
            # via anchors), drop #-style location numbers
            if t.startswith("#"):
                continue
            # keep bare numbers that look like brand identity; drop obvious store numbers
            # heuristic: 4+ digit bare numbers are store/location numbers
            if len(t) >= 4 and t.isdigit():
                continue
        toks.append(t)
    # drop "STORE 1234" style location phrases (word + adjacent digits already removed,
    # so drop the bare location word only at the end after a brand)
    out = []
    for i, t in enumerate(toks):
        if t in LOC_WORDS and i > 0:
            continue
        out.append(t)
    while out and out[-1] in LEGAL_SUFFIX:
        out.pop()
    return " ".join(out)

# reviewed anchor map: normalized key prefix -> canonical chain id
ANCHORS = {
    "TIM HORTONS": "TIM HORTONS",
    "SUBWAY": "SUBWAY",
    "STARBUCKS": "STARBUCKS",
    "MCDONALD S": "MCDONALD S",
    "A AND W": "A AND W",
    "PIZZA PIZZA": "PIZZA PIZZA",
    "PIZZA NOVA": "PIZZA NOVA",
    "DOMINO S": "DOMINO S",
    "PIZZA HUT": "PIZZA HUT",
    "BURGER KING": "BURGER KING",
    "KFC": "KFC",
    "TACO BELL": "TACO BELL",
    "WENDY S": "WENDY S",
    "HARVEY S": "HARVEY S",
    "POPEYES": "POPEYES",
    "POPEYE S": "POPEYES",
    "CHIPOTLE MEXICAN GRILL": "CHIPOTLE MEXICAN GRILL",
    "FRESHII": "FRESHII",
    "OSMOW S": "OSMOW S",
    "AROMA ESPRESSO BAR": "AROMA ESPRESSO BAR",
    "BOOSTER JUICE": "BOOSTER JUICE",
    "CHATIME": "CHATIME",
    "COCO FRESH TEA AND JUICE": "COCO FRESH TEA AND JUICE",
    "GONG CHA": "GONG CHA",
    "KUNG FU TEA": "KUNG FU TEA",
    "THE ALLEY": "THE ALLEY",
    "REAL FRUIT BUBBLE TEA": "REAL FRUIT BUBBLE TEA",
    "SECOND CUP": "SECOND CUP",
    "LITTLE CAESARS": "LITTLE CAESARS",
    "PIZZAVILLE": "PIZZAVILLE",
    "PIZZAIOLO": "PIZZAIOLO",
    "FAT BASTARD BURRITO": "FAT BASTARD BURRITO",
    "BURRITO BOYZ": "BURRITO BOYZ",
    "BARBURRITO": "BARBURRITO",
    "BAR BURRITO": "BARBURRITO",
    "JIMMY THE GREEK": "JIMMY THE GREEK",
    "MR GREEK": "MR GREEK",
    "PITA LAND": "PITA LAND",
    "PITA LITE": "PITA LITE",
    "WILD WING": "WILD WING",
    "THE BURGER S PRIEST": "THE BURGER S PRIEST",
    "HERO CERTIFIED BURGERS": "HERO CERTIFIED BURGERS",
    "FIVE GUYS BURGERS AND FRIES": "FIVE GUYS BURGERS AND FRIES",
    "SHAKE SHACK": "SHAKE SHACK",
    "DAVE S HOT CHICKEN": "DAVE S HOT CHICKEN",
    "CHURCH S TEXAS CHICKEN": "CHURCH S TEXAS CHICKEN",
    "CHICK FIL A": "CHICK FIL A",
    "JOLLIBEE": "JOLLIBEE",
    "SWISS CHALET": "SWISS CHALET",
    "ST LOUIS BAR AND GRILL": "ST LOUIS BAR AND GRILL",
    "THE KEG STEAKHOUSE AND BAR": "THE KEG STEAKHOUSE AND BAR",
    "BOSTON PIZZA": "BOSTON PIZZA",
    "ELEVEN": "SEVEN ELEVEN",
    "7 ELEVEN": "SEVEN ELEVEN",
    "CIRCLE K": "CIRCLE K",
    "ESSO": "ESSO",
    "SHELL": "SHELL",
    "PETRO CANADA": "PETRO CANADA",
    "METRO": "METRO",
    "LOBLAWS": "LOBLAWS",
    "FRESHCO": "FRESHCO",
    "FOOD BASICS": "FOOD BASICS",
    "NO FRILLS": "NO FRILLS",
    "FARM BOY": "FARM BOY",
    "RABBA FINE FOODS": "RABBA FINE FOODS",
    "LONGO S": "LONGO S",
    "WAL MART": "WAL MART",
    "DOLLARAMA": "DOLLARAMA",
    "BULK BARN": "BULK BARN",
    "SHOPPERS DRUG MART": "SHOPPERS DRUG MART",
    "REXALL PHARMA PLUS": "REXALL PHARMA PLUS",
    "INS MARKET": "INS MARKET",
    "HASTY MARKET": "HASTY MARKET",
    "HEALTHY PLANET": "HEALTHY PLANET",
    "GATEWAY NEWSTAND": "GATEWAY NEWSTAND",
    "GATEWAY NEWSTANDS": "GATEWAY NEWSTAND",
    "BENTO SUSHI": "BENTO SUSHI",
    "MONKEY SUSHI": "MONKEY SUSHI",
    "KIBO SUSHI": "KIBO SUSHI",
    "AH SO SUSHI": "AH SO SUSHI",
    "SZECHUAN EXPRESS": "SZECHUAN EXPRESS",
    "THAI EXPRESS": "THAI EXPRESS",
    "MANCHU WOK": "MANCHU WOK",
    "SHANGHAI": "SHANGHAI",
    "MY ROTI PLACE MY DOSA PLACE": "MY ROTI PLACE MY DOSA PLACE",
    "TAGPUAN": "TAGPUAN",
    "KINTON RAMEN": "KINTON RAMEN",
    "SANSOTEI RAMEN": "SANSOTEI RAMEN",
    "AJISEN RAMEN": "AJISEN RAMEN",
    "VILLA MADINA": "VILLA MADINA",
    "LAZEEZ SHAWARMA": "LAZEEZ SHAWARMA",
    "SHAWARMA ROYALE": "SHAWARMA ROYALE",
    "SHELBY S LEGENDARY SHAWARMA": "SHELBY S LEGENDARY SHAWARMA",
    "SULTAN S MEDITERRANEAN GRILL": "SULTAN S MEDITERRANEAN GRILL",
    "ALI BABA S": "ALI BABA S",
    "MR SOUVLAKI": "MR SOUVLAKI",
    "MAMMA S PIZZA": "MAMMA S PIZZA",
    "GINO S PIZZA": "GINO S PIZZA",
    "BLONDIES PIZZA": "BLONDIES PIZZA",
    "FRESHSLICE PIZZA": "FRESHSLICE PIZZA",
    "NORTH OF BROOKLYN PIZZERIA": "NORTH OF BROOKLYN PIZZERIA",
    "TAQUERIA EL PASTORCITO": "TAQUERIA EL PASTORCITO",
    "GUS TACOS": "GUS TACOS",
    "JERK KING": "JERK KING",
    "BB Q CHICKEN": "BB Q CHICKEN",
    "POULET ROUGE": "POULET ROUGE",
    "LA PREP": "LA PREP",
    "IMPERFECT FRESH EATS": "IMPERFECT FRESH EATS",
    "SALUS FRESH FOODS": "SALUS FRESH FOODS",
    "FAST FRESH FOODS": "FAST FRESH FOODS",
    "MAD RADISH": "MAD RADISH",
    "ROWE FARMS": "ROWE FARMS",
    "HEAL WELLNESS": "HEAL WELLNESS",
    "ASIAN GOURMET": "ASIAN GOURMET",
    "CALIFORNIA SANDWICHES": "CALIFORNIA SANDWICHES",
    "RUDY": "RUDY",
    "FRESH BURGER": "FRESH BURGER",
    "GABBY S": "GABBY S",
    "NEW YORK FRIES": "NEW YORK FRIES",
    "MR PRETZELS": "MR PRETZELS",
    "KERNELS": "KERNELS",
    "MARRY ME MOCHI": "MARRY ME MOCHI",
    "DANISH PASTRY HOUSE": "DANISH PASTRY HOUSE",
    "COBS BREAD": "COBS BREAD",
    "AU PAIN DORE": "AU PAIN DORE",
    "WHAT A BAGEL": "WHAT A BAGEL",
    "THE BAGEL STOP": "THE BAGEL STOP",
    "SUNSET GRILL": "SUNSET GRILL",
    "EGGSMART": "EGGSMART",
    "CAFE LANDWER": "CAFE LANDWER",
    "THE FRY": "THE FRY",
    "HALIBUT HOUSE FISH AND CHIPS": "HALIBUT HOUSE FISH AND CHIPS",
    "PUMPERNICKEL S": "PUMPERNICKEL S",
    "ROLLTATION": "ROLLTATION",
    "TAHINI S": "TAHINI S",
    "WING MACHINE": "WING MACHINE",
    "FIREHOUSE SUBS": "FIREHOUSE SUBS",
    "MR SUB": "MR SUB",
    "BOURBON ST GRILL": "BOURBON ST GRILL",
    "THE POKE BOX": "THE POKE BOX",
    "SOUPERLICIOUS": "SOUPERLICIOUS",
    "NEO COFFEE BAR": "NEO COFFEE BAR",
    "PATTIES EXPRESS": "PATTIES EXPRESS",
    "NUTBAR": "NUTBAR",
    "TANGHULU TANGHULU": "TANGHULU TANGHULU",
    "COCO": "COCO",
    "YOGEN FRUZ": "YOGEN FRUZ",
    "BASKIN ROBBINS": "BASKIN ROBBINS",
    "DAIRY QUEEN": "DAIRY QUEEN",
    "KRISPY KREME DOUGHNUTS": "KRISPY KREME DOUGHNUTS",
    "LA DIPERIE": "LA DIPERIE",
    "PIZZA DEPOT": "PIZZA DEPOT",
    "241 PIZZA": "241 PIZZA",
    "PAPA JOHN S": "PAPA JOHN S",
    "PI": "PI CO",
    "JIMMY S COFFEE": "JIMMY S COFFEE",
    "PILOT COFFEE ROASTERS": "PILOT COFFEE ROASTERS",
    "BALZAC S COFFEE": "BALZAC S COFFEE",
    "MOS MOS COFFEE": "MOS MOS COFFEE",
    "MOFER COFFEE": "MOFER COFFEE",
    "COFFEE TIME": "COFFEE TIME",
    "JAVA JOE S": "JAVA JOE S",
    "CRAIG S COOKIES": "CRAIG S COOKIES",
    "VILLAGE JUICERY": "VILLAGE JUICERY",
    "JUGO JUICE": "JUGO JUICE",
    "DARK HORSE ESPRESSO BAR": "DARK HORSE ESPRESSO BAR",
    "KIDS AND": "KIDS AND",
    "COTTI COFFEE": "COTTI COFFEE",
}

# combos stay separate: they are dual-brand premises, not either chain's location
COMBO_PASSTHROUGH = {"KFC TACO BELL", "ESSO CIRCLE K"}

DISPLAY = {
    "TIM HORTONS": "Tim Hortons", "SUBWAY": "Subway", "STARBUCKS": "Starbucks",
    "MCDONALD S": "McDonald's", "A AND W": "A&W", "PIZZA PIZZA": "Pizza Pizza",
    "PIZZA NOVA": "Pizza Nova", "DOMINO S": "Domino's", "PIZZA HUT": "Pizza Hut",
    "BURGER KING": "Burger King", "KFC": "KFC", "TACO BELL": "Taco Bell",
    "WENDY S": "Wendy's", "HARVEY S": "Harvey's", "POPEYES": "Popeyes",
    "CHIPOTLE MEXICAN GRILL": "Chipotle Mexican Grill", "FRESHII": "Freshii",
    "OSMOW S": "Osmow's", "AROMA ESPRESSO BAR": "Aroma Espresso Bar",
    "BOOSTER JUICE": "Booster Juice", "CHATIME": "Chatime",
    "COCO FRESH TEA AND JUICE": "CoCo Fresh Tea and Juice", "GONG CHA": "Gong Cha",
    "KUNG FU TEA": "Kung Fu Tea", "THE ALLEY": "The Alley",
    "REAL FRUIT BUBBLE TEA": "Real Fruit Bubble Tea", "SECOND CUP": "Second Cup",
    "LITTLE CAESARS": "Little Caesars", "PIZZAVILLE": "Pizzaville",
    "PIZZAIOLO": "Pizzaiolo", "FAT BASTARD BURRITO": "Fat Bastard Burrito",
    "BURRITO BOYZ": "Burrito Boyz", "BARBURRITO": "BarBurrito",
    "JIMMY THE GREEK": "Jimmy the Greek", "MR GREEK": "Mr. Greek",
    "PITA LAND": "Pita Land", "PITA LITE": "Pita Lite", "WILD WING": "Wild Wing",
    "THE BURGER S PRIEST": "The Burger's Priest",
    "HERO CERTIFIED BURGERS": "Hero Certified Burgers",
    "FIVE GUYS BURGERS AND FRIES": "Five Guys Burgers and Fries",
    "SHAKE SHACK": "Shake Shack", "DAVE S HOT CHICKEN": "Dave's Hot Chicken",
    "CHURCH S TEXAS CHICKEN": "Church's Texas Chicken", "CHICK FIL A": "Chick-fil-A",
    "JOLLIBEE": "Jollibee", "SWISS CHALET": "Swiss Chalet",
    "ST LOUIS BAR AND GRILL": "St. Louis Bar and Grill",
    "THE KEG STEAKHOUSE AND BAR": "The Keg Steakhouse and Bar",
    "BOSTON PIZZA": "Boston Pizza", "SEVEN ELEVEN": "7-Eleven",
    "CIRCLE K": "Circle K", "ESSO": "Esso", "SHELL": "Shell",
    "PETRO CANADA": "Petro-Canada", "METRO": "Metro", "LOBLAWS": "Loblaws",
    "FRESHCO": "FreshCo", "FOOD BASICS": "Food Basics", "NO FRILLS": "No Frills",
    "FARM BOY": "Farm Boy", "RABBA FINE FOODS": "Rabba Fine Foods",
    "LONGO S": "Longo's", "WAL MART": "Walmart", "DOLLARAMA": "Dollarama",
    "BULK BARN": "Bulk Barn", "SHOPPERS DRUG MART": "Shoppers Drug Mart",
    "REXALL PHARMA PLUS": "Rexall Pharma Plus", "INS MARKET": "INS Market",
    "HASTY MARKET": "Hasty Market", "HEALTHY PLANET": "Healthy Planet",
    "GATEWAY NEWSTAND": "Gateway Newstands", "BENTO SUSHI": "Bento Sushi",
    "MONKEY SUSHI": "Monkey Sushi", "KIBO SUSHI": "Kibo Sushi",
    "AH SO SUSHI": "Ah-So Sushi", "SZECHUAN EXPRESS": "Szechuan Express",
    "THAI EXPRESS": "Thai Express", "MANCHU WOK": "Manchu Wok",
    "SHANGHAI": "Shanghai 360", "MY ROTI PLACE MY DOSA PLACE": "My Roti Place / My Dosa Place",
    "TAGPUAN": "Tagpuan", "KINTON RAMEN": "Kinton Ramen",
    "SANSOTEI RAMEN": "Sansotei Ramen", "AJISEN RAMEN": "Ajisen Ramen",
    "VILLA MADINA": "Villa Madina", "LAZEEZ SHAWARMA": "Lazeez Shawarma",
    "SHAWARMA ROYALE": "Shawarma Royale",
    "SHELBY S LEGENDARY SHAWARMA": "Shelby's Legendary Shawarma",
    "SULTAN S MEDITERRANEAN GRILL": "Sultan's Mediterranean Grill",
    "ALI BABA S": "Ali Baba's", "MR SOUVLAKI": "Mr. Souvlaki",
    "MAMMA S PIZZA": "Mamma's Pizza", "GINO S PIZZA": "Gino's Pizza",
    "BLONDIES PIZZA": "Blondies Pizza", "FRESHSLICE PIZZA": "Freshslice Pizza",
    "NORTH OF BROOKLYN PIZZERIA": "North of Brooklyn Pizzeria",
    "TAQUERIA EL PASTORCITO": "Taqueria El Pastorcito", "GUS TACOS": "Gus Tacos",
    "JERK KING": "Jerk King", "BB Q CHICKEN": "bb.q Chicken",
    "POULET ROUGE": "Poulet Rouge", "LA PREP": "La Prep",
    "IMPERFECT FRESH EATS": "Imperfect Fresh Eats",
    "SALUS FRESH FOODS": "Salus Fresh Foods", "FAST FRESH FOODS": "Fast Fresh Foods",
    "MAD RADISH": "Mad Radish", "ROWE FARMS": "Rowe Farms",
    "HEAL WELLNESS": "Heal Wellness", "ASIAN GOURMET": "Asian Gourmet",
    "CALIFORNIA SANDWICHES": "California Sandwiches", "RUDY": "Rudy",
    "FRESH BURGER": "Fresh Burger", "GABBY S": "Gabby's",
    "NEW YORK FRIES": "New York Fries", "MR PRETZELS": "Mr. Pretzels",
    "KERNELS": "Kernels", "MARRY ME MOCHI": "Marry Me Mochi",
    "DANISH PASTRY HOUSE": "Danish Pastry House", "COBS BREAD": "Cobs Bread",
    "AU PAIN DORE": "Au Pain Dore", "WHAT A BAGEL": "What a Bagel",
    "THE BAGEL STOP": "The Bagel Stop", "SUNSET GRILL": "Sunset Grill",
    "EGGSMART": "Eggsmart", "CAFE LANDWER": "Cafe Landwer", "THE FRY": "The Fry",
    "HALIBUT HOUSE FISH AND CHIPS": "Halibut House Fish and Chips",
    "PUMPERNICKEL S": "Pumpernickel's", "ROLLTATION": "Rolltation",
    "TAHINI S": "Tahini's", "WING MACHINE": "Wing Machine",
    "FIREHOUSE SUBS": "Firehouse Subs", "MR SUB": "Mr. Sub",
    "BOURBON ST GRILL": "Bourbon St. Grill", "THE POKE BOX": "The Poke Box",
    "SOUPERLICIOUS": "Souperlicious", "NEO COFFEE BAR": "Neo Coffee Bar",
    "PATTIES EXPRESS": "Patties Express", "NUTBAR": "Nutbar",
    "TANGHULU TANGHULU": "Tanghulu Tanghulu", "COCO": "CoCo (standalone)",
    "YOGEN FRUZ": "Yogen Fruz", "BASKIN ROBBINS": "Baskin Robbins",
    "DAIRY QUEEN": "Dairy Queen", "KRISPY KREME DOUGHNUTS": "Krispy Kreme Doughnuts",
    "LA DIPERIE": "La Diperie", "PIZZA DEPOT": "Pizza Depot",
    "PAPA JOHN S": "Papa John's", "PI CO": "Pi Co.",
    "JIMMY S COFFEE": "Jimmy's Coffee", "PILOT COFFEE ROASTERS": "Pilot Coffee Roasters",
    "BALZAC S COFFEE": "Balzac's Coffee", "MOS MOS COFFEE": "Mos Mos Coffee",
    "MOFER COFFEE": "Mofer Coffee", "COFFEE TIME": "Coffee Time",
    "JAVA JOE S": "Java Joe's", "CRAIG S COOKIES": "Craig's Cookies",
    "VILLAGE JUICERY": "Village Juicery", "JUGO JUICE": "Jugo Juice",
    "DARK HORSE ESPRESSO BAR": "Dark Horse Espresso Bar",
    "KIDS AND": "Kids and Company", "COTTI COFFEE": "Cotti Coffee",
    "KFC TACO BELL": "KFC / Taco Bell (combo)", "ESSO CIRCLE K": "Esso / Circle K (combo)",
    "241 PIZZA": "241 Pizza",
}

def chain_id(norm):
    if norm in COMBO_PASSTHROUGH:
        return norm
    # longest anchor first
    for a in sorted(ANCHORS, key=len, reverse=True):
        if norm == a or norm.startswith(a + " "):
            return ANCHORS[a]
    return None  # unmatched: independent, not a chain

STATUS_RANK = {"Pass": 0, "Conditional Pass": 1, "Closed": 2}

def main():
    raw = sys.argv[1] if len(sys.argv) > 1 else "dinesafe.csv"
    outdir = sys.argv[2] if len(sys.argv) > 2 else "public/data"

    # 1. build inspections: (estId, inspectionDate) -> {status worst, severities, meta}
    insp = {}
    loc_meta = {}  # estId -> (estName best, address, lat, lon)
    max_date = "0000-00-00"
    rows = 0
    with open(raw, encoding="utf-8") as f:
        r = csv.DictReader(f)
        for row in r:
            rows += 1
            eid = row["estId"].strip()
            d = (row["inspectionDate"] or "").strip()[:10]
            if not eid or not d:
                continue
            if d > max_date:
                max_date = d
            status = row["inspectionStatus"].strip()
            sev = row["severity"].strip()
            key = (eid, d)
            cur = insp.get(key)
            if cur is None:
                cur = {"estId": eid, "name": row["estName"].strip(), "date": d,
                       "status": status, "sevs": set()}
                insp[key] = cur
            else:
                if STATUS_RANK.get(status, -1) > STATUS_RANK.get(cur["status"], -1):
                    cur["status"] = status
            cur["sevs"].add(sev)
            if eid not in loc_meta:
                loc_meta[eid] = {"name": row["estName"].strip(), "address": row["address"].strip(),
                                 "lat": row["latitude"].strip(), "lon": row["longitude"].strip()}

    window_start = (date.fromisoformat(max_date) - timedelta(days=365)).isoformat()
    print(f"rows={rows} inspections={len(insp)} max_date={max_date} window={window_start}..{max_date}")

    # 2. chain assignment per inspection in window
    chains = defaultdict(list)
    unmatched_locs = defaultdict(set)
    for (eid, d), it in insp.items():
        if d < window_start:
            continue
        cid = chain_id(normalize(it["name"]))
        if cid is None:
            unmatched_locs[normalize(it["name"])].add(eid)
            continue
        chains[cid].append(it)

    # 3. keep chains with >=10 locations in window
    MIN_LOC = 10
    kept = {}
    for cid, items in chains.items():
        locs = {it["estId"] for it in items}
        if len(locs) >= MIN_LOC:
            kept[cid] = (items, locs)

    print(f"chains with >={MIN_LOC} locations in window: {len(kept)}")

    # 4. per-chain stats
    def stats(cid, items, locs):
        n = len(items)
        cond = sum(1 for i in items if i["status"] == "Conditional Pass")
        closed = sum(1 for i in items if i["status"] == "Closed")
        crucial = sum(1 for i in items if "C - Crucial" in i["sevs"])
        signif = sum(1 for i in items if "S - Significant" in i["sevs"])
        cond_locs = {i["estId"] for i in items if i["status"] == "Conditional Pass"}
        crucial_locs = {i["estId"] for i in items if "C - Crucial" in i["sevs"]}
        return {
            "id": cid, "name": DISPLAY.get(cid, cid.title()),
            "locations": len(locs), "inspections": n,
            "inspections_per_location": round(n / len(locs), 2),
            "conditional_pass_rate": round(cond / n * 100, 1) if n else 0,
            "closed_rate": round(closed / n * 100, 1) if n else 0,
            "crucial_rate": round(crucial / n * 100, 1) if n else 0,
            "significant_rate": round(signif / n * 100, 1) if n else 0,
            "conditional_count": cond, "closed_count": closed, "crucial_count": crucial,
            "locations_with_conditional_pct": round(len(cond_locs) / len(locs) * 100, 1),
            "locations_with_crucial_pct": round(len(crucial_locs) / len(locs) * 100, 1),
        }

    ranking = sorted((stats(c, i, l) for c, (i, l) in kept.items()),
                     key=lambda s: -s["conditional_pass_rate"])

    # citywide baseline
    allw = [it for (eid, d), it in insp.items() if d >= window_start]
    base = {"inspections": len(allw),
            "conditional_rate": round(sum(1 for i in allw if i["status"] == "Conditional Pass") / len(allw) * 100, 1),
            "crucial_rate": round(sum(1 for i in allw if "C - Crucial" in i["sevs"]) / len(allw) * 100, 1),
            "closed_rate": round(sum(1 for i in allw if i["status"] == "Closed") / len(allw) * 100, 1)}

    # 5. match table: chain -> raw name variants with counts
    variants = defaultdict(Counter)
    for cid, (items, locs) in kept.items():
        for it in items:
            variants[cid][it["name"]] += 1

    # 6. locations per chain (drill-down)
    loc_rows = []
    for cid, (items, locs) in kept.items():
        latest = {}
        for it in items:
            k = it["estId"]
            if k not in latest or it["date"] > latest[k]["date"]:
                latest[k] = it
        for eid, it in latest.items():
            m = loc_meta.get(eid, {})
            loc_rows.append({"chain": cid, "name": m.get("name", it["name"]),
                             "address": m.get("address", ""), "lat": m.get("lat", ""),
                             "lon": m.get("lon", ""), "last_inspection": it["date"],
                             "last_status": it["status"]})

    import os
    os.makedirs(outdir, exist_ok=True)
    summary = {
        "project": "canada-dinesafe-report-card",
        "source": "City of Toronto Open Data: DineSafe",
        "source_url": "https://open.toronto.ca/dataset/dinesafe/",
        "licence": "Open Government Licence - Toronto",
        "retrieved": date.today().isoformat(),
        "data_window": {"start": window_start, "end": max_date},
        "raw_rows": rows, "inspections_window": base["inspections"],
        "citywide": base, "min_locations": MIN_LOC,
        "chains_ranked": len(ranking),
        "note": "Franchised vs corporate-owned locations are not distinguished in the source data.",
    }
    json.dump(summary, open(f"{outdir}/summary.json", "w"), indent=2)
    json.dump(ranking, open(f"{outdir}/chains.json", "w"), indent=2)
    json.dump({c: dict(v) for c, v in variants.items()}, open(f"{outdir}/match_table.json", "w"), indent=2)
    json.dump(loc_rows, open(f"{outdir}/chain_locations.json", "w"), indent=2)

    # CSV downloads
    with open(f"{outdir}/chains.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["chain_id", "chain_name", "locations", "inspections", "inspections_per_location",
                    "conditional_pass_rate_pct", "conditional_pass_count", "crucial_infractions_rate_pct",
                    "crucial_inspections", "significant_rate_pct", "closed_rate_pct", "closed_count",
                    "locations_with_conditional_pct", "locations_with_crucial_pct"])
        for s in ranking:
            w.writerow([s["id"], s["name"], s["locations"], s["inspections"], s["inspections_per_location"],
                        s["conditional_pass_rate"], s["conditional_count"], s["crucial_rate"],
                        s["crucial_count"], s["significant_rate"], s["closed_rate"], s["closed_count"],
                        s["locations_with_conditional_pct"], s["locations_with_crucial_pct"]])
    with open(f"{outdir}/match_table.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["chain_id", "chain_name", "raw_establishment_name", "rows_merged"])
        for cid in sorted(variants):
            for raw_name, cnt in variants[cid].most_common():
                w.writerow([cid, DISPLAY.get(cid, cid.title()), raw_name, cnt])

    print("citywide:", base)
    print("\ntop 15 by conditional-pass rate:")
    for s in ranking[:15]:
        print(f"  {s['conditional_pass_rate']:5.1f}%  ({s['locations']:3d} loc, {s['inspections']:4d} insp)  {s['name']}")
    print("\nbottom 5:")
    for s in ranking[-5:]:
        print(f"  {s['conditional_pass_rate']:5.1f}%  ({s['locations']:3d} loc, {s['inspections']:4d} insp)  {s['name']}")

if __name__ == "__main__":
    main()
