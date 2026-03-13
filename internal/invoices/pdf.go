package invoices

import (
	"bytes"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"erp-project/internal/models"

	"github.com/jung-kurt/gofpdf/v2"
)

// findLogoPath returns path to logo: uploads/logo.png|jpg, or frontend/public/Logo.png
func findLogoPath(uploadDir string) string {
	for _, name := range []string{"logo.png", "logo.jpg"} {
		p := filepath.Join(uploadDir, name)
		if _, err := os.Stat(p); err == nil {
			return p
		}
	}
	// Fallback: frontend public logo (Silverline Logo.png)
	for _, rel := range []string{"frontend/public/Logo.png", "frontend/public/logo.png"} {
		if _, err := os.Stat(rel); err == nil {
			return rel
		}
	}
	return ""
}

const defaultCompanyName = "Silverline LTD"

// Brand accent (Silverline blue)
const accentR, accentG, accentB = 30, 64, 124

// GeneratePDF creates an invoice PDF with logo, stamp, and creator (professional ERP template)
func GeneratePDF(inv *models.Invoice, uploadDir string) ([]byte, error) {
	companyName := os.Getenv("COMPANY_NAME")
	if companyName == "" {
		companyName = defaultCompanyName
	}

	pdf := gofpdf.New("P", "mm", "A4", "")
	pdf.SetMargins(15, 12, 15)
	pdf.SetAutoPageBreak(false, 0) // single page only
	pdf.AddPage()

	// --- Header: logo and company side-by-side, both above the divider line ---
	logoPath := findLogoPath(uploadDir)
	logoW, logoH := 28.0, 12.0 // compact so logo stays fully above the line
	if logoPath != "" {
		imgType := "PNG"
		if ext := strings.ToLower(filepath.Ext(logoPath)); ext == ".jpg" || ext == ".jpeg" {
			imgType = "JPG"
		}
		pdf.ImageOptions(logoPath, 15, 8, logoW, logoH, false, gofpdf.ImageOptions{ImageType: imgType, ReadDpi: true}, 0, "")
	}
	// Company block — right of logo, no overlap
	pdf.SetFont("Arial", "B", 20)
	pdf.SetTextColor(accentR, accentG, accentB)
	pdf.SetXY(50, 9)
	pdf.CellFormat(0, 6, companyName, "", 0, "L", false, 0, "")
	pdf.SetFont("Arial", "", 8)
	pdf.SetTextColor(80, 80, 80)
	pdf.SetXY(50, 16)
	pdf.CellFormat(0, 4, "Official Invoice", "", 0, "L", false, 0, "")
	pdf.SetTextColor(0, 0, 0)
	// Divider line — below logo (ends ~y22) and company block
	pdf.SetFillColor(accentR, accentG, accentB)
	pdf.Rect(15, 28, 180, 2, "F")
	pdf.SetY(36) // clear space below bar — no overlap

	// --- Two-column: Bill To (left) | Invoice details (right) ---
	startY := pdf.GetY()
	// Left column: Bill To
	pdf.SetFont("Arial", "B", 10)
	pdf.SetTextColor(80, 80, 80)
	pdf.CellFormat(0, 4, "BILL TO", "", 0, "L", false, 0, "")
	pdf.SetTextColor(0, 0, 0)
	pdf.Ln(4)
	pdf.SetFont("Arial", "B", 11)
	vendorName := "—"
	if inv.Vendor != nil {
		vendorName = inv.Vendor.Name
	}
	pdf.CellFormat(90, 5, truncate(vendorName, 40), "", 0, "L", false, 0, "")
	pdf.Ln(4)
	pdf.SetFont("Arial", "", 9)
	projectName := "—"
	if inv.Project != nil {
		projectName = inv.Project.Name
	}
	pdf.CellFormat(90, 4, fmt.Sprintf("Project: %s", truncate(projectName, 35)), "", 0, "L", false, 0, "")
	pdf.Ln(8)

	// Right column: Invoice #, dates, status
	pdf.SetY(startY)
	pdf.SetX(110)
	pdf.SetFont("Arial", "", 9)
	pdf.SetTextColor(80, 80, 80)
	pdf.CellFormat(38, 4, "Invoice #", "", 0, "L", false, 0, "")
	pdf.SetTextColor(0, 0, 0)
	pdf.CellFormat(0, 4, inv.InvoiceNumber, "", 0, "R", false, 0, "")
	pdf.Ln(4)
	pdf.SetX(110)
	pdf.SetTextColor(80, 80, 80)
	pdf.CellFormat(38, 4, "Issue Date", "", 0, "L", false, 0, "")
	pdf.SetTextColor(0, 0, 0)
	pdf.CellFormat(0, 4, inv.IssueDate.Format("02 Jan 2006"), "", 0, "R", false, 0, "")
	pdf.Ln(4)
	pdf.SetX(110)
	pdf.SetTextColor(80, 80, 80)
	pdf.CellFormat(38, 4, "Due Date", "", 0, "L", false, 0, "")
	pdf.SetTextColor(0, 0, 0)
	pdf.CellFormat(0, 4, inv.DueDate.Format("02 Jan 2006"), "", 0, "R", false, 0, "")
	pdf.Ln(4)
	pdf.SetX(110)
	pdf.SetTextColor(80, 80, 80)
	pdf.CellFormat(38, 4, "Status", "", 0, "L", false, 0, "")
	sr, sg, sb := statusColor(inv.Status)
	pdf.SetTextColor(sr, sg, sb)
	pdf.CellFormat(0, 4, string(inv.Status), "", 0, "R", false, 0, "")
	pdf.SetTextColor(0, 0, 0)
	pdf.Ln(8)

	// Amount summary box
	pdf.SetFillColor(248, 250, 252)
	pdf.SetDrawColor(220, 225, 230)
	pdf.RoundedRect(15, pdf.GetY(), 180, 14, 2, "1234", "FD")
	amtY := pdf.GetY() + 3
	pdf.SetXY(20, amtY)
	pdf.SetFont("Arial", "B", 11)
	pdf.SetTextColor(accentR, accentG, accentB)
	pdf.CellFormat(0, 5, fmt.Sprintf("Total: $%s", formatMoney(inv.TotalAmount)), "", 0, "L", false, 0, "")
	pdf.SetXY(125, amtY)
	pdf.SetFont("Arial", "", 9)
	pdf.SetTextColor(0, 0, 0)
	pdf.CellFormat(0, 5, fmt.Sprintf("Remaining: $%s", formatMoney(inv.RemainingAmount)), "", 0, "R", false, 0, "")
	pdf.Ln(14)

	// Materials / Line Items (from linked Purchase Request)
	maxItems := 10 // cap for single page
	if inv.PurchaseRequest != nil && len(inv.PurchaseRequest.Items) > 0 {
		pdf.SetFont("Arial", "B", 10)
		pdf.SetTextColor(accentR, accentG, accentB)
		pdf.CellFormat(0, 5, "Materials / Line Items", "", 0, "L", false, 0, "")
		pdf.SetTextColor(0, 0, 0)
		pdf.Ln(5)
		pdf.SetFont("Arial", "", 8)
		reqMeta := fmt.Sprintf("Request ID: %s | %s", inv.PurchaseRequest.ID[:8]+"...", inv.PurchaseRequest.CreatedAt.Format("02 Jan 2006"))
		if inv.PurchaseRequest.Requester != nil {
			reqMeta += fmt.Sprintf(" | by %s", truncate(inv.PurchaseRequest.Requester.Name, 25))
		}
		pdf.CellFormat(0, 4, truncate(reqMeta, 70), "", 1, "L", false, 0, "")
		pdf.Ln(2)
		pdf.SetFont("Arial", "B", 8)
		pdf.SetFillColor(accentR, accentG, accentB)
		pdf.SetTextColor(255, 255, 255)
		pdf.CellFormat(75, 6, "Material", "1", 0, "L", true, 0, "")
		pdf.CellFormat(22, 6, "Qty", "1", 0, "R", true, 0, "")
		pdf.CellFormat(22, 6, "Unit", "1", 0, "L", true, 0, "")
		pdf.CellFormat(28, 6, "Unit Price", "1", 0, "R", true, 0, "")
		pdf.CellFormat(28, 6, "Total", "1", 0, "R", true, 0, "")
		pdf.SetTextColor(0, 0, 0)
		pdf.Ln(6)
		pdf.SetFont("Arial", "", 8)
		items := inv.PurchaseRequest.Items
		if len(items) > maxItems {
			items = items[:maxItems]
		}
		for _, item := range items {
			matName := "—"
			unit := "—"
			if item.Material != nil {
				matName = item.Material.Name
				if item.Material.Unit != "" {
					unit = string(item.Material.Unit)
				}
			}
			pdf.CellFormat(75, 5, truncate(matName, 35), "1", 0, "L", false, 0, "")
			pdf.CellFormat(22, 5, fmt.Sprintf("%.2f", item.Quantity), "1", 0, "R", false, 0, "")
			pdf.CellFormat(22, 5, unit, "1", 0, "L", false, 0, "")
			pdf.CellFormat(28, 5, fmt.Sprintf("$%s", formatMoney(item.UnitPrice)), "1", 0, "R", false, 0, "")
			pdf.CellFormat(28, 5, fmt.Sprintf("$%s", formatMoney(item.TotalPrice)), "1", 0, "R", false, 0, "")
			pdf.Ln(5)
		}
		if len(inv.PurchaseRequest.Items) > maxItems {
			pdf.SetFont("Arial", "", 8)
			pdf.SetTextColor(100, 100, 100)
			pdf.CellFormat(0, 5, fmt.Sprintf("... and %d more items", len(inv.PurchaseRequest.Items)-maxItems), "", 0, "L", false, 0, "")
			pdf.SetTextColor(0, 0, 0)
			pdf.Ln(5)
		}
		pdf.Ln(4)
	} else if inv.PurchaseRequest != nil && inv.PurchaseRequest.MaterialID != "" {
		pdf.SetFont("Arial", "B", 10)
		pdf.CellFormat(0, 4, "Material", "", 0, "L", false, 0, "")
		pdf.Ln(3)
		pdf.SetFont("Arial", "", 8)
		matName := "—"
		if inv.PurchaseRequest.Material != nil {
			matName = inv.PurchaseRequest.Material.Name
		}
		pdf.CellFormat(0, 4, fmt.Sprintf("%s | Qty: %.2f | $%s | Total $%s", matName, inv.PurchaseRequest.Quantity, formatMoney(inv.PurchaseRequest.UnitPrice), formatMoney(inv.PurchaseRequest.TotalPrice)), "", 0, "L", false, 0, "")
		pdf.Ln(6)
	}

	// Description (max 2 lines for single page)
	if inv.Description != "" {
		pdf.SetFont("Arial", "B", 9)
		pdf.CellFormat(0, 4, "Description", "", 0, "L", false, 0, "")
		pdf.Ln(3)
		pdf.SetFont("Arial", "", 8)
		desc := inv.Description
		if len(desc) > 120 {
			desc = desc[:117] + "..."
		}
		pdf.MultiCell(0, 4, desc, "", "L", false)
		pdf.Ln(4)
	}

	// Payments table (compact, max 6 rows)
	maxPayments := 6
	if len(inv.Payments) > 0 {
		pdf.SetFont("Arial", "B", 10)
		pdf.SetTextColor(accentR, accentG, accentB)
		pdf.CellFormat(0, 5, "Payment History", "", 0, "L", false, 0, "")
		pdf.SetTextColor(0, 0, 0)
		pdf.Ln(4)
		pdf.SetFont("Arial", "B", 8)
		pdf.SetFillColor(248, 250, 252)
		pdf.SetDrawColor(220, 225, 230)
		pdf.CellFormat(32, 5, "Date", "1", 0, "L", true, 0, "")
		pdf.CellFormat(30, 5, "Amount", "1", 0, "R", true, 0, "")
		pdf.CellFormat(38, 5, "Method", "1", 0, "L", true, 0, "")
		pdf.CellFormat(75, 5, "Reference", "1", 0, "L", true, 0, "")
		pdf.Ln(5)
		pdf.SetFont("Arial", "", 8)
		payments := inv.Payments
		if len(payments) > maxPayments {
			payments = payments[:maxPayments]
		}
		for _, p := range payments {
			pdf.CellFormat(32, 4, p.PaymentDate.Format("02 Jan 06"), "1", 0, "L", false, 0, "")
			pdf.CellFormat(30, 4, fmt.Sprintf("$%s", formatMoney(p.Amount)), "1", 0, "R", false, 0, "")
			pdf.CellFormat(38, 4, truncate(formatPaymentMethod(p.PaymentMethod), 12), "1", 0, "L", false, 0, "")
			pdf.CellFormat(75, 4, truncate(p.ReferenceNumber, 35), "1", 0, "L", false, 0, "")
			pdf.Ln(4)
		}
		if len(inv.Payments) > maxPayments {
			pdf.SetFont("Arial", "", 8)
			pdf.SetTextColor(100, 100, 100)
			pdf.CellFormat(0, 4, fmt.Sprintf("... %d more payments", len(inv.Payments)-maxPayments), "", 0, "L", false, 0, "")
			pdf.SetTextColor(0, 0, 0)
			pdf.Ln(4)
		}
		pdf.Ln(4)
	}

	// Footer: fixed near bottom of A4 (297mm - 25mm margin)
	footerY := 272.0
	if pdf.GetY() > footerY-15 {
		footerY = pdf.GetY() + 8
	}
	pdf.SetY(footerY)
	pdf.SetDrawColor(220, 225, 230)
	pdf.Line(15, footerY-2, 195, footerY-2)
	pdf.Ln(4)

	// Left: Prepared by + Generated
	pdf.SetFont("Arial", "", 9)
	pdf.SetTextColor(100, 100, 100)
	creatorName := "—"
	if inv.Creator != nil {
		creatorName = inv.Creator.Name
	}
	pdf.CellFormat(0, 5, fmt.Sprintf("Prepared by: %s  ·  Generated: %s", creatorName, time.Now().Format("02 Jan 2006 15:04")), "", 0, "L", false, 0, "")
	pdf.SetTextColor(0, 0, 0)

	// Right: Stamp (image or styled text)
	stampPath := filepath.Join(uploadDir, "stamp.png")
	if _, err := os.Stat(stampPath); err == nil {
		pdf.ImageOptions(stampPath, 135, footerY-5, 50, 0, false, gofpdf.ImageOptions{ImageType: "PNG", ReadDpi: true}, 0, "")
	} else {
		stampPath = filepath.Join(uploadDir, "stamp.jpg")
		if _, err2 := os.Stat(stampPath); err2 == nil {
			pdf.ImageOptions(stampPath, 135, footerY-5, 50, 0, false, gofpdf.ImageOptions{ImageType: "JPG", ReadDpi: true}, 0, "")
		} else {
			pdf.SetXY(140, footerY-8)
			pdf.SetFillColor(245, 245, 250)
			pdf.SetDrawColor(accentR, accentG, accentB)
			pdf.SetFont("Arial", "B", 11)
			pdf.SetTextColor(accentR, accentG, accentB)
			pdf.CellFormat(45, 12, "APPROVED", "1", 0, "C", true, 0, "")
			pdf.SetTextColor(0, 0, 0)
		}
	}

	var buf bytes.Buffer
	err := pdf.Output(&buf)
	if err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

func formatMoney(v float64) string {
	return fmt.Sprintf("%.2f", v)
}

func statusColor(s models.InvoiceStatus) (r, g, b int) {
	switch s {
	case models.InvoiceStatusPaid:
		return 22, 163, 74
	case models.InvoiceStatusPartiallyPaid:
		return 234, 179, 8
	case models.InvoiceStatusOverdue:
		return 220, 38, 38
	default:
		return 80, 80, 80
	}
}

func truncate(s string, max int) string {
	if len(s) <= max {
		return s
	}
	return s[:max-3] + "..."
}

func formatPaymentMethod(m models.PaymentMethod) string {
	switch m {
	case models.PaymentMethodBankTransfer:
		return "Bank Transfer"
	case models.PaymentMethodCheque:
		return "Cheque"
	case models.PaymentMethodCreditCard:
		return "Credit Card"
	case models.PaymentMethodCash:
		return "Cash"
	default:
		return string(m)
	}
}
