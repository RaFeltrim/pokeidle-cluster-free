"""
Orquestrador Autônomo 24/7 do Pokéidle.io — Google Antigravity IDE
Pipeline assíncrona baseada no Antigravity Python SDK (v0.1.23)
"""

import asyncio
import logging

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s"
)

async def run_pipeline():
    try:
        # Importa os módulos nativos do Antigravity SDK
        from antigravity_sdk import Agent, BuiltinTools
        
        logging.info("Inicializando o agente com o modelo gemini-3-pro no Pokéidle...")
        agent = Agent(
            model="gemini-3-pro",
            tools=[
                BuiltinTools.VIEW_FILE,
                BuiltinTools.START_SUBAGENT,
                BuiltinTools.FINISH
            ]
        )

        # Fase 1: Setup Inicial da Conta do Zero
        logging.info("Fase 1: Executando preparos iniciais na conta do zero (/setup-conta-zero)...")
        setup_prompt = (
            "/browser Execute integralmente as instruções de .agents/workflows/setup-conta-zero.md "
            "na aba https://pokeidle.io/app. Confirme os IVs do inicial P2, ative Auto-Poção, "
            "Auto-Revive, Modo Economia e reporte o screenshot da primeira hunt segura de Kanto."
        )
        setup_resp = await agent.run(setup_prompt)
        print(await setup_resp.text())

        # Fase 2: Loop Contínuo de Otimização e Troca de Hunts
        cycle_count = 0
        while True:
            cycle_count += 1
            logging.info(f"--- Iniciando Ciclo de Otimização #{cycle_count} ---")
            journey_prompt = (
                "/browser Execute o workflow .agents/workflows/ciclo-jornada-auto.md em "
                "https://pokeidle.io/app. Verifique se a caçada está ativa, consulte a barra /hunt "
                "para mudar para a área de maior XP/h com 0 mortes/h, reponha poções se necessário "
                "e verifique marcos de desbloqueio (80 PvP, 150 Outland/Ginásios, 300 Bosses). "
                "Retorne o resumo de telemetria da sessão."
            )
            try:
                cycle_resp = await agent.run(journey_prompt)
                print(await cycle_resp.text())
            except Exception as err:
                logging.error(f"Erro transitório no ciclo #{cycle_count}: {err}. Retomando no próximo.")

            # Intervalo de 15 minutos (900s) entre verificações de rotina
            await asyncio.sleep(900)

    except ImportError:
        logging.warning(
            "Antigravity SDK não detectado no ambiente Python padrão. "
            "A orquestração pode ser executada nativamente via chat do agente utilizando os slash commands "
            "/setup-conta-zero, /goal e /schedule."
        )

if __name__ == "__main__":
    asyncio.run(run_pipeline())

