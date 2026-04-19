# A* Pathfinding – Safe Path Agent
import json
import math
import heapq
from pathlib import Path


# Load road graph
GRAPH_PATH = Path(__file__).parent.parent / "data" / "road_graph.json"
road_graph = None

def load_graph():
    global road_graph
    # Try local copy first, then server copy
    paths = [
        GRAPH_PATH,
        Path(__file__).parent.parent.parent / "server" / "data" / "roadGraph.json",
    ]
    for p in paths:
        if p.exists():
            with open(p) as f:
                road_graph = json.load(f)
            return road_graph
    return None


def find_safe_path(start: dict, end: dict, zone_statuses: dict) -> dict | None:
    """
    A* pathfinding on road graph with risk-weighted cost function.

    Args:
        start: {lat, lng}
        end: {lat, lng}
        zone_statuses: {zone_id: "SAFE"|"MODERATE"|"UNSAFE"}

    Returns:
        {path, nodes, distance, safety_score} or None
    """
    if road_graph is None:
        load_graph()
    if road_graph is None:
        return None

    nodes = road_graph["nodes"]
    edges = road_graph["edges"]
    zone_map = road_graph.get("zone_mapping", {})

    # Find nearest nodes
    def nearest_node(lat, lng):
        best = None
        best_dist = float("inf")
        for nid, node in nodes.items():
            d = math.sqrt((node["lat"] - lat) ** 2 + (node["lng"] - lng) ** 2)
            if d < best_dist:
                best_dist = d
                best = nid
        return best

    start_node = nearest_node(start.get("lat", 0), start.get("lng", 0))
    end_node = nearest_node(end.get("lat", 0), end.get("lng", 0))

    if not start_node or not end_node:
        return None

    # Build adjacency list with risk-weighted costs
    adjacency: dict[str, list] = {nid: [] for nid in nodes}

    def risk_weight(zone_id):
        if not zone_id:
            return 1.0
        status = zone_statuses.get(zone_id, "SAFE")
        if status == "UNSAFE":
            return 10.0
        if status == "MODERATE":
            return 3.0
        return 1.0

    for edge in edges:
        from_risk = risk_weight(zone_map.get(edge["from"]))
        to_risk = risk_weight(zone_map.get(edge["to"]))
        avg_risk = (from_risk + to_risk) / 2
        cost = edge["distance"] * avg_risk

        adjacency[edge["from"]].append({
            "to": edge["to"],
            "cost": cost,
            "distance": edge["distance"],
        })
        adjacency[edge["to"]].append({
            "to": edge["from"],
            "cost": cost,
            "distance": edge["distance"],
        })

    # A* heuristic
    def heuristic(node_id):
        n = nodes[node_id]
        e = nodes[end_node]
        return math.sqrt(
            (n["lat"] - e["lat"]) ** 2 + (n["lng"] - e["lng"]) ** 2
        ) * 111000  # approx meters

    # A* search using min-heap
    g_score = {nid: float("inf") for nid in nodes}
    g_score[start_node] = 0

    f_score = {nid: float("inf") for nid in nodes}
    f_score[start_node] = heuristic(start_node)

    came_from = {}
    open_set = [(f_score[start_node], start_node)]
    closed = set()

    while open_set:
        _, current = heapq.heappop(open_set)

        if current in closed:
            continue
        closed.add(current)

        if current == end_node:
            # Reconstruct path
            path_nodes = []
            node = end_node
            while node is not None:
                path_nodes.insert(0, node)
                node = came_from.get(node)

            coordinates = [[nodes[n]["lat"], nodes[n]["lng"]] for n in path_nodes]
            total_distance = g_score[end_node]

            # Safety score
            max_cost = len(path_nodes) * 500 * 10
            safety_score = max(0, min(100, int(100 * (1 - total_distance / max_cost)))) if max_cost > 0 else 50

            return {
                "path": coordinates,
                "nodes": path_nodes,
                "distance": total_distance,
                "safety_score": safety_score,
            }

        for neighbor in adjacency.get(current, []):
            if neighbor["to"] in closed:
                continue
            tentative_g = g_score[current] + neighbor["cost"]
            if tentative_g < g_score[neighbor["to"]]:
                came_from[neighbor["to"]] = current
                g_score[neighbor["to"]] = tentative_g
                f_score[neighbor["to"]] = tentative_g + heuristic(neighbor["to"])
                heapq.heappush(open_set, (f_score[neighbor["to"]], neighbor["to"]))

    return None  # No path found
