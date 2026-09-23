from abc import ABC, abstractmethod
from typing import Optional
from dataclasses import dataclass, field


@dataclass
class SendResult:
    success: bool
    message_id: Optional[str] = None
    error: Optional[str] = None
    raw_response: Optional[dict] = field(default=None, repr=False)


class WhatsAppProvider(ABC):
    """Interface that both Cloud API and Baileys providers implement."""

    def __init__(self, number_config: dict):
        self.number_config = number_config
        self.wa_number_id: int = number_config["id"]
        self.provider_name: str = number_config["provider"]

    @abstractmethod
    def send_text(self, to: str, text: str) -> SendResult:
        ...

    @abstractmethod
    def send_template(self, to: str, template_name: str,
                      language_code: str = "en_US",
                      components: list | None = None) -> SendResult:
        ...

    @abstractmethod
    def send_media(self, to: str, media_type: str,
                   media_id_or_url: str, caption: str = "",
                   filename: str = "") -> SendResult:
        ...

    @abstractmethod
    def get_connection_status(self) -> dict:
        ...

    def supports_templates(self) -> bool:
        return False

    def supports_flows(self) -> bool:
        return False
