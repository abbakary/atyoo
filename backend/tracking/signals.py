from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone
from .models import Order, JobCard, Invoice


def _job_card_number(dt: timezone.datetime, seq: int) -> str:
    return f"JC-{dt.strftime('%Y%m%d')}-{seq:03d}"

def _invoice_number(dt: timezone.datetime, seq: int) -> str:
    return f"INV-{dt.strftime('%Y%m%d')}-{seq:03d}"

@receiver(post_save, sender=Order)
def create_documents_on_completion(sender, instance: Order, created, **kwargs):
    if instance.status != Order.COMPLETED:
        return
    # Create job card if not exists
    if not hasattr(instance, 'job_card'):
        seq = JobCard.objects.filter(created_at__date=timezone.now().date()).count() + 1
        JobCard.objects.create(number=_job_card_number(timezone.now(), seq), order=instance)
    # Create invoice if not exists
    if not hasattr(instance, 'invoice'):
        seq = Invoice.objects.filter(created_at__date=timezone.now().date()).count() + 1
        Invoice.objects.create(number=_invoice_number(timezone.now(), seq), order=instance)
