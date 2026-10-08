"""Create a deterministic, fictitious retail transaction dataset for SegPredict.

The file follows the columns expected by POST /upload-csv.  It includes both
customers who do and do not purchase again in the final 30-day target period,
which lets the training pipeline exercise its classification path.
"""

from __future__ import annotations

import csv
from pathlib import Path


OUTPUT = Path(__file__).parents[1] / "sample_data" / "customer_transactions_demo.csv"

FIRST_NAMES = [
    "Aarav", "Aisha", "Arjun", "Diya", "Ishaan", "Kavya", "Neha", "Rohan",
    "Priya", "Vikram", "Meera", "Kabir", "Anaya", "Dev", "Ira", "Nikhil",
]
LAST_NAMES = [
    "Sharma", "Patel", "Khan", "Iyer", "Gupta", "Reddy", "Singh", "Das",
]
PRODUCTS = [
    "Wireless Mouse", "Notebook Set", "Coffee Maker", "Desk Lamp", "Water Bottle",
    "Travel Backpack", "Phone Stand", "Yoga Mat", "Bluetooth Speaker", "Lunch Box",
]


def transaction_rows() -> list[dict[str, object]]:
    rows: list[dict[str, object]] = []
    invoice_number = 10001
    historical_dates = ["03/12/2026 10:15:00", "05/26/2026 14:30:00", "08/12/2026 18:45:00"]
    future_dates = ["09/05/2026 11:20:00", "09/24/2026 16:10:00"]

    for customer_number in range(1, 49):
        first = FIRST_NAMES[(customer_number - 1) % len(FIRST_NAMES)]
        last = LAST_NAMES[(customer_number - 1) % len(LAST_NAMES)]
        customer_id = 50000 + customer_number
        # High-value repeat purchasers have more items and higher prices.
        is_repeat_buyer = customer_number % 2 == 0
        base_price = 12 + (customer_number % 10) * 7
        quantity = 1 + (customer_number % 5)

        dates = historical_dates + (future_dates if is_repeat_buyer else [])
        for order_index, invoice_date in enumerate(dates):
            product = PRODUCTS[(customer_number + order_index) % len(PRODUCTS)]
            price = round(base_price * (1 + order_index * 0.12), 2)
            rows.append(
                {
                    "Invoice": f"INV-{invoice_number}",
                    "StockCode": f"SKU-{100 + ((customer_number + order_index) % 50):03d}",
                    "Description": product,
                    "Quantity": quantity + (order_index % 2),
                    "InvoiceDate": invoice_date,
                    "Price": price,
                    "Customer ID": customer_id,
                    "Country": "India",
                }
            )
            invoice_number += 1
    return rows


def main() -> None:
    rows = transaction_rows()
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    with OUTPUT.open("w", newline="", encoding="utf-8") as output_file:
        writer = csv.DictWriter(output_file, fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(rows)
    print(f"Wrote {len(rows)} transactions for 48 fictitious customers to {OUTPUT}")


if __name__ == "__main__":
    main()
