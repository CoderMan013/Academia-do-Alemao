import os
import traceback
from datetime import datetime, timezone

class Logger:
    """
    Classe Logger
    Responsável por registrar mensagens de erro e exceções com stack trace completo.
    """

    LOG_FILE = "api/system/log.log"

    @staticmethod
    def log_error(message: str):
        """
        Registra uma mensagem de erro genérica.
        """
        Logger._write_log("ERROR", message)

    @staticmethod
    def log(error: Exception):
        """
        Registra uma exceção completa no log, incluindo traceback, e imprime no console.
        """
        # Captura o stack trace completo da exceção
        error_trace = ''.join(traceback.format_exception(type(error), error, error.__traceback__))

        # Escreve no log
        Logger._write_log("ERROR", error_trace)

    @staticmethod
    def _write_log(log_type: str, message: str):
        """
        Escreve a entrada de log no arquivo, criando diretório se necessário.
        """
        directory_path = os.path.dirname(Logger.LOG_FILE)
        os.makedirs(directory_path, exist_ok=True)

        date_time = datetime.now(timezone.utc).isoformat()
        entry = f"[{date_time}] [{log_type}]\n{message}\n{'-'*80}\n"

        try:
            with open(Logger.LOG_FILE, "a", encoding="utf-8") as f:
                f.write(entry)
        except Exception as e:
            print("🔴 Falha ao gravar log:", e)
