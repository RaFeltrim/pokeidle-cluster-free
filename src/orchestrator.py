"""
Orquestrador Autônomo 24/7 do Pokéidle.io — Antigravity Pipeline
Executa a supervisão contínua das contas via supervisor mestre e telemetria CDP
"""

import asyncio
import logging
import subprocess
import os

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s"
)

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CLUSTER_MGR = os.path.join(ROOT_DIR, "src", "cluster_manager.js")

async def run_pipeline():
    logging.info("Iniciando orquestrador do cluster Pokéidle em background...")
    try:
        proc = subprocess.Popen(
            ["node", CLUSTER_MGR],
            cwd=ROOT_DIR,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True
        )
        logging.info(f"Supervisor do Cluster iniciado com PID: {proc.pid}")
        
        while True:
            await asyncio.sleep(60)
            if proc.poll() is not None:
                logging.warning(f"Processo do cluster terminou com código {proc.returncode}. Reiniciando...")
                proc = subprocess.Popen(
                    ["node", CLUSTER_MGR],
                    cwd=ROOT_DIR,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.STDOUT,
                    text=True
                )
    except Exception as err:
        logging.error(f"Erro na execução da pipeline: {err}")

if __name__ == "__main__":
    asyncio.run(run_pipeline())
