"""Knowledge graph engine for health risk reasoning.

Provides a pure Python Graph-Based Reasoning Engine that maps patient risk factors
to disease nodes and generates structural graph insights.
"""
from __future__ import annotations
from typing import Dict, Any, List, Tuple


class Node:
    """Represents a node in the knowledge graph."""
    def __init__(self, node_id: str, name: str, node_type: str):
        self.id = node_id
        self.name = name
        self.type = node_type  # "RiskFactor" or "Disease"


class Edge:
    """Represents a directed relationship between two nodes."""
    def __init__(self, source: str, target: str, relationship: str):
        self.source = source
        self.target = target
        self.relationship = relationship


class _KG:
    def __init__(self):
        self.nodes: Dict[str, Node] = {}
        self.edges: List[Edge] = []
        # Adjacency list: target_id -> list of (source_id, relationship_type)
        self.adj_in: Dict[str, List[Tuple[str, str]]] = {}
        self._build_graph()

    def add_node(self, node_id: str, name: str, node_type: str):
        self.nodes[node_id] = Node(node_id, name, node_type)
        if node_id not in self.adj_in:
            self.adj_in[node_id] = []

    def add_edge(self, source: str, target: str, relationship: str):
        self.edges.append(Edge(source, target, relationship))
        self.adj_in[target].append((source, relationship))

    def _build_graph(self):
        """Constructs the base ontology for the health knowledge graph."""
        # Add Disease Nodes
        self.add_node("hypertension", "Hypertension", "Disease")
        self.add_node("diabetes", "Diabetes", "Disease")
        self.add_node("cvd", "Cardiovascular Disease", "Disease")
        self.add_node("malnutrition", "Malnutrition", "Disease")

        # Add Risk Factor Nodes
        self.add_node("smoking", "Smoking", "RiskFactor")
        self.add_node("high_salt", "High Salt Intake", "RiskFactor")
        self.add_node("high_bmi", "High BMI / Obesity", "RiskFactor")
        self.add_node("low_activity", "Low Physical Activity", "RiskFactor")
        self.add_node("family_history", "Family History", "RiskFactor")
        self.add_node("poor_diet", "Poor Diet", "RiskFactor")
        self.add_node("high_stress", "High Stress", "RiskFactor")
        self.add_node("low_income", "Low Income", "RiskFactor")
        self.add_node("low_diversity", "Low Dietary Diversity", "RiskFactor")
        self.add_node("children_under5", "Children Under 5 Present", "RiskFactor")

        # Add Directed Edges (Relationships)
        self.add_edge("smoking", "cvd", "strongly increases risk of")
        self.add_edge("smoking", "hypertension", "worsens")
        self.add_edge("high_salt", "hypertension", "directly elevates")
        self.add_edge("high_salt", "cvd", "increases risk of")
        self.add_edge("high_bmi", "diabetes", "is a primary risk factor for")
        self.add_edge("high_bmi", "hypertension", "increases risk of")
        self.add_edge("high_bmi", "cvd", "increases risk of")
        self.add_edge("low_activity", "cvd", "increases risk of")
        self.add_edge("low_activity", "diabetes", "increases risk of")
        self.add_edge("family_history", "cvd", "increases baseline risk for")
        self.add_edge("family_history", "diabetes", "increases baseline risk for")
        self.add_edge("family_history", "hypertension", "increases baseline risk for")
        self.add_edge("poor_diet", "diabetes", "increases risk of")
        self.add_edge("poor_diet", "hypertension", "worsens")
        self.add_edge("high_stress", "hypertension", "temporarily elevates")
        self.add_edge("high_stress", "cvd", "correlates with")
        self.add_edge("low_income", "malnutrition", "strongly increases risk of")
        self.add_edge("low_diversity", "malnutrition", "directly causes")
        self.add_edge("poor_diet", "malnutrition", "causes")
        self.add_edge("children_under5", "malnutrition", "increases household risk of")

    def _get_active_risk_factors(self, patient: dict) -> List[str]:
        """Maps patient data points to active risk factor nodes in the graph."""
        active = []
        if patient.get("smoking"):
            active.append("smoking")
        if patient.get("salt_intake") == "high":
            active.append("high_salt")
        if patient.get("bmi", 0) >= 25.0:
            active.append("high_bmi")
        if patient.get("activity_level") == "low":
            active.append("low_activity")
        if patient.get("family_history"):
            active.append("family_history")
        if patient.get("diet_quality") == "poor":
            active.append("poor_diet")
        if patient.get("stress_level") == "high":
            active.append("high_stress")
        if str(patient.get("income_level", "")).lower() == "low":
            active.append("low_income")
        if float(patient.get("dietary_diversity", 10)) < 4:
            active.append("low_diversity")
        if int(patient.get("children_under5", 0)) > 2:
            active.append("children_under5")
        return active

    def graph_reasoning(self, patient: dict, risk_scores: dict, lang: str = "en") -> Dict[str, Any]:
        """
        Traverses the graph from active risk factors to elevated diseases to
        generate structural insights.
        """
        active_factors = self._get_active_risk_factors(patient)
        insights = []
        
        # Identify elevated diseases based on ML predictions
        elevated_diseases = []
        if risk_scores.get("hypertension", {}).get("risk_level") in ["medium", "high"]:
            elevated_diseases.append("hypertension")
        if risk_scores.get("diabetes", {}).get("risk_level") in ["medium", "high"]:
            elevated_diseases.append("diabetes")
        if risk_scores.get("heart_disease", {}).get("risk_level") in ["medium", "high"]:
            elevated_diseases.append("cvd") # Map ML key to Graph key
        if risk_scores.get("malnutrition", {}).get("risk_level") in ["medium", "high"]:
            elevated_diseases.append("malnutrition")
            
        # Graph Traversal: For each elevated disease, trace paths back to active risk factors
        for disease_id in elevated_diseases:
            if disease_id not in self.adj_in:
                continue
            
            contributing_factors = []
            for source_id, rel in self.adj_in[disease_id]:
                if source_id in active_factors:
                    source_name = self.nodes[source_id].name
                    contributing_factors.append(f"{source_name} ({rel})")
            
            disease_name = self.nodes[disease_id].name
            if contributing_factors:
                factors_str = ", ".join(contributing_factors)
                insights.append(f"Graph Path Found: Your risk for {disease_name} is structurally elevated by: {factors_str}.")
            else:
                insights.append(f"Graph Path Missing: Your risk for {disease_name} is statistically elevated by the ML model, but primary behavioral graph links are not present.")
                
        # Sub-graph structural synergistic risk detection
        if "smoking" in active_factors and "high_bmi" in active_factors:
            insights.append("Synergistic Graph Risk Detected: Smoking and High BMI form a compound structural risk multiplier for Cardiovascular Disease.")
            
        if not insights and active_factors:
            insights.append("Graph Structure Note: Active risk factors mapped, but current traversal shows low immediate disease risk intersection.")

        if not active_factors:
            insights.append("Graph Structure Note: No active primary risk factor nodes detected.")

        return {
            "active_nodes": active_factors,
            "elevated_disease_nodes": elevated_diseases,
            "insights": insights
        }


# Singleton instance exported for use in the app
knowledge_graph = _KG()
