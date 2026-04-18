# 📊 Reports Generation Feature Guide

## Overview
The Reports Generation feature allows admins to generate beautiful, professional PDF and CSV reports containing all system analytics and data insights. Located in the Admin Dashboard with a single click.

---

## 🎨 UI Components

### Location
- **Admin Dashboard** → Top-right header
- Button labeled "Export" with download icon

### Features

#### 1. **Beautiful Modal Interface**
- Gradient header (red-900 theme)
- Organized sections with icons
- Professional design with proper spacing
- Responsive layout for all screen sizes

#### 2. **Date Range Selection**
- Quick presets:
  - Last 7 days
  - Last 30 days
  - This Month
  - Last Month
- Custom date picker for exact ranges
- Default: Last 30 days

#### 3. **Filtering Options**
- **Status Filter**: All statuses or specific ones
  - pending_verification
  - approved
  - rejected
  - in_progress
  - submitted
  - resolved
  
- **Category Filter**: All categories or specific ones
  - Infrastructure
  - Suspicious Activity
  - Environmental
  - Public Disturbance
  - Natural Disaster

#### 4. **Export Format Selection**
- **PDF Report**: Professional formatted document with charts
- **CSV Export**: Spreadsheet-compatible format for Excel/Sheets

#### 5. **Additional Options (Checkboxes)**
- Include charts & analytics
- Include leaderboard data

#### 6. **Preview Section**
- Shows selected report format
- Displays date range
- Shows selected status filter

---

## 📄 PDF Report Content

### Header Section
- Bantay Reports title with red gradient
- Generation date
- Applied date range
- Professional styling

### Key Performance Indicators
Three prominent cards displaying:
1. **Total Reports** (Red gradient)
2. **Resolved Reports** (Green gradient)
3. **Response Rate %** (Cyan gradient)

### Report Summary Table
Shows breakdown by status:
- Status name
- Count of reports
- Percentage distribution
- Alternating row colors for readability

### Category Breakdown Table
Lists all categories with:
- Category name
- Report count for that category

### Leaderboard (if selected)
Top 10 reporters showing:
- Rank (#1, #2, etc.)
- Reporter name
- Total reports submitted
- Points earned

### Footer
- Confidentiality notice
- System name and generation timestamp

---

## 📊 CSV Report Structure

Flat table format with the following columns:
- **Report ID**: Unique identifier
- **Title**: Report title
- **Category**: Report category
- **Status**: Current workflow status
- **Reporter**: Name or "Anonymous"
- **Date Filed**: Timestamp
- **Date Resolved**: Resolution timestamp (or N/A)
- **Location**: Barangay/location
- **Upvotes**: Community engagement count
- **Comments**: Discussion count
- **Admin Notes**: Internal notes

### Why CSV?
- Compatible with Excel, Google Sheets, etc.
- Easy to pivot and analyze
- Good for data import/export
- Suitable for bulk analysis

---

## 🔄 Workflow

1. **Click Export Button**
   - Opens Report Generation Modal

2. **Configure Report**
   - Select date range
   - Apply filters (status, category)
   - Choose format (PDF or CSV)
   - Toggle optional sections

3. **Generate**
   - Click "Generate Report" button
   - System fetches all necessary data
   - Displays loading state
   - Generates selected format

4. **Download**
   - File automatically downloads
   - PDF: `Bantay-Reports-[start-date]-to-[end-date].pdf`
   - CSV: `Bantay-Reports-[start-date]-to-[end-date].csv`

---

## 🛠️ Technical Details

### Technologies Used
- **html2pdf.js**: HTML to PDF conversion
- **papaparse**: CSV generation
- **Framer Motion**: Smooth animations
- **Lucide React**: Icons
- **date-fns**: Date manipulation

### Data Sources
Reports aggregate data from:
1. **reports table**: Core report data with all metadata
2. **admin_stats endpoint**: Key metrics
3. **leaderboard table**: Top reporter rankings
4. **trends data**: Monthly statistics
5. **categories data**: Category breakdowns
6. **barangays data**: Geographic distribution

### Filtering Logic
- **Date Range**: Reports created between start and end date
- **Status**: Filters by current report status
- **Category**: Filters by report category
- All filters work together (AND logic)

---

## 📋 Report Use Cases

### Weekly Management Report
- Date Range: Last 7 days
- Status: All
- Category: All
- Format: PDF
- Includes: Charts & leaderboard

### Monthly Performance Review
- Date Range: This Month
- Status: resolved
- Category: All
- Format: PDF
- Purpose: Track resolution performance

### Incident Analysis
- Date Range: Custom (specific incident period)
- Status: All
- Category: Specific (e.g., "Suspicious Activity")
- Format: CSV
- Purpose: Detailed incident tracking

### Data Archival
- Date Range: Last Month
- Status: resolved
- Category: All
- Format: CSV
- Purpose: Historical record keeping

### Barangay Performance
- Date Range: Last 30 days
- Status: All
- Category: All
- Format: PDF
- Includes: Leaderboard for community engagement

---

## 🎯 Key Features Highlights

✅ **One-Click Export**
- No complex configurations needed
- Smart defaults (last 30 days)

✅ **Beautiful PDFs**
- Professional formatting
- Color-coded sections
- Easy to read tables
- Proper pagination

✅ **Flexible Filtering**
- Multiple filter combinations
- Quick presets for common date ranges
- Custom date selection

✅ **Comprehensive Data**
- Executive summary with KPIs
- Detailed breakdown by category
- Top performers leaderboard
- All necessary metadata

✅ **Performance Optimized**
- Async data fetching
- Smooth loading states
- Error handling with user feedback

✅ **Secure & Professional**
- Admin-only access
- Confidentiality footer in PDFs
- Complete audit trail available

---

## 🚀 Future Enhancements

Potential additions:
- Scheduled automated reports (daily/weekly/monthly)
- Email delivery option
- Custom report templates
- Advanced charting in PDF
- Comparison reports (month-over-month)
- Data visualization dashboard
- Export to Google Drive/Dropbox
- Report versioning/history

---

## 💡 Pro Tips

1. **Quick Monthly Review**: Use "This Month" preset, select PDF format
2. **Incident Investigation**: Use custom dates + specific category
3. **Leaderboard Recognition**: Include leaderboard in monthly PDF reports
4. **Data Backup**: Export all resolved reports to CSV at month end
5. **Performance Tracking**: Compare metrics across different date ranges

---

## ⚙️ System Requirements

- Admin role required
- Minimum 500ms response time for data fetching
- Sufficient disk space for PDF downloads
- JavaScript enabled in browser
- Modern browser with blob/download support

---

## 📞 Support

For issues or enhancements:
1. Check that all filters are correctly set
2. Verify date range is valid
3. Ensure you have admin privileges
4. Clear browser cache if experiencing issues
5. Try the other export format (PDF vs CSV)

Generated reports are timestamped and include metadata for easy reference.
