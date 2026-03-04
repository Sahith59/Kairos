import os
from neo4j import GraphDatabase

NEO4J_URI = os.getenv("NEO4J_URI", "bolt://localhost:7687")
NEO4J_USER = os.getenv("NEO4J_USER", "neo4j")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "password")

def seed_graph():
    driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))
    
    # Wait for neo4j to be ready
    import time
    for _ in range(10):
        try:
            with driver.session() as session:
                session.run("RETURN 1")
            break
        except Exception:
            print("Waiting for Neo4j to be ready...")
            time.sleep(2)
    
    with driver.session() as session:
        # Clear existing
        session.run("MATCH (n) DETACH DELETE n")
        
        # Create Services
        services = [
            "AuthService", "PaymentService", "InventoryService",
            "OrderService", "SearchService", "PostgreSQL", "RedisCache"
        ]
        
        for svc in services:
            session.run("CREATE (:Service {name: $name})", name=svc)
            
        # Create Dependencies (A depends on B)
        dependencies = [
            ("OrderService", "InventoryService"),
            ("OrderService", "PaymentService"),
            ("InventoryService", "PostgreSQL"),
            ("PaymentService", "PostgreSQL"),
            ("AuthService", "RedisCache"),
            ("SearchService", "PostgreSQL")
        ]
        
        for src, dst in dependencies:
            session.run("""
                MATCH (a:Service {name: $src}), (b:Service {name: $dst})
                CREATE (a)-[:DEPENDS_ON]->(b)
            """, src=src, dst=dst)
            
        print("Neo4j Graph Database successfully seeded with microservice architecture!")
        
    driver.close()

if __name__ == "__main__":
    seed_graph()
