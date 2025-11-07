# Matrixify (Formerly Excelify) - Comprehensive Documentation Summary

## Overview

**Matrixify** is a powerful Shopify app designed for bulk import, export, editing, and migration of store data using spreadsheet files (Excel XLSX or CSV formats). It enables merchants and developers to perform time-consuming data operations efficiently, handling files up to 20 GB.

**Official Website:** https://matrixify.app/  
**Shopify App Store:** https://apps.shopify.com/excel-export-import  
**Documentation:** https://matrixify.app/documentation/

---

## Core Capabilities

### Supported Data Types (18 Categories)

Matrixify can import/export the following Shopify data:

1. **Products** - Full product catalog with variants, images, and metafields
2. **Smart Collections** - Automated collections based on conditions
3. **Custom Collections** - Manual product collections
4. **Customers** - Customer profiles and data
5. **Companies** (B2B) - Business customer entities
6. **Discounts** - Promotional codes and automatic discounts
7. **Draft Orders** - Incomplete orders
8. **Orders** - Completed transactions
9. **Payouts** - Financial settlement records
10. **Pages** - Store content pages
11. **Blog Posts** - Blog content
12. **Redirects** - URL redirects (301s)
13. **Activity** - Store activity logs
14. **Files** - Media and document files
15. **Metaobjects** - Custom data structures
16. **Metafields** - Custom metadata across entities
17. **Navigation Menus** - Store navigation structure
18. **Shop Settings** - Store configuration

---

## How Matrixify Works

### File Format Support

- **Excel Files (.XLSX)** - Up to 1 million rows, recommended for datasets under 600,000 rows
- **CSV Files** - Uncompressed or zipped, supports files up to 20 GB
- **Shopify CSV Format** - Native Shopify format compatibility
- **Google Sheets** - Via public link sharing
- **Multiple CSV Files** - Up to 30 GB combined when zipped

### Character Encoding

Matrixify auto-detects and converts various CSV encodings including:
- UTF-8
- ISO-8859-1 (Latin 1)
- ISO-2022-JP
- Automatically converts to UTF-8 for Shopify compatibility

### File Size Limits

| Upload Type | Maximum Size |
|-------------|--------------|
| Manual uploads | 5 GB |
| URL/FTP/Cloud imports | 20 GB |
| Multiple CSV files (zipped) | 30 GB combined |
| Excel row limit | 1,000,000 rows |

---

## Import Process

### File Upload Methods

Matrixify supports importing from multiple sources:

1. **Direct Upload** - Drag-and-drop or file selection
2. **URL Import** - Direct links to hosted files
3. **FTP/SFTP Servers** - Automated server imports
4. **Cloud Storage**:
   - Dropbox
   - Google Drive
   - Google Sheets
   - SharePoint
   - Amazon S3 (via SFTP services like Couchdrop)

### Import Commands

The **Command column** controls how data is processed during import:

| Command | Behavior |
|---------|----------|
| `NEW` | Create new items only; fails if item already exists |
| `MERGE` (default) | Update existing items or create if not found |
| `UPDATE` | Update existing items only; skip if not found |
| `REPLACE` | Delete completely and recreate from file data |
| `DELETE` | Remove items by ID or Handle |
| `IGNORE` | Skip processing for that row |

**Important:** 
- Most entities default to `MERGE` if no command is specified
- Orders default to `NEW` if no command is specified
- `REPLACE` permanently deletes data not included in the import file

### Import Monitoring

During import, Matrixify tracks:
- New items created
- Items updated
- Items replaced
- Items deleted
- Failed items with error details

**Import Results File** is generated after completion containing:
- Reference IDs
- Import status ("OK" or "Failed")
- Detailed error comments for troubleshooting

### Job Management

- **Sequential Processing:** Only one import/export runs at a time (Shopify API limitation)
- **Job Queueing:** Queue multiple jobs to run automatically in sequence
- **Background Processing:** Jobs continue even if browser is closed
- **Progress Tracking:** Real-time status updates in "All Jobs" section
- **Cancellation:** Can cancel anytime; already processed data remains in store

---

## Products Import/Export

### Required Sheet Name
- **Excel:** Sheet must be named "Product" or "Products"
- **CSV:** Filename can be anything (e.g., "my-shopify-products.csv")

### Essential Product Columns

#### Basic Product Information

| Column | Description | Notes |
|--------|-------------|-------|
| `ID` | Shopify product identifier | Auto-generated; leave empty for new products |
| `Handle` | URL-friendly identifier | Converted to lowercase automatically |
| `Command` | Import action | NEW, MERGE, UPDATE, REPLACE, DELETE, IGNORE |
| `Title` | Product name | **Mandatory for new products** |
| `Body HTML` | Product description | Supports plain text or HTML |
| `Vendor` | Brand/manufacturer name | Cannot be empty in Shopify |
| `Type` | Product category/type | Custom classification |
| `Status` | Publication status | Active, Archived, Draft, or Unlisted |

#### Variant Management

Products can have up to **100 variants** (size, color, etc.):

- `Variant ID` - Unique variant identifier
- `Variant SKU` - Stock Keeping Unit
- `Option1 Name/Value` - First option (e.g., Size)
- `Option2 Name/Value` - Second option (e.g., Color)
- `Option3 Name/Value` - Third option (e.g., Material)
- `Variant Price` - Selling price
- `Variant Compare At Price` - Original price (for discounts)
- `Variant Inventory Qty` - Stock quantity

#### Image Management

- `Image Src` - Direct, publicly accessible URL (JPG, PNG, GIF, WEBP)
- `Image Command` - MERGE, DELETE, or REPLACE
- `Image Alt Text` - SEO descriptions for accessibility
- Images must be hosted publicly and accessible via direct links

#### Advanced Features

**Product Categories:** Uses Shopify's standardized taxonomy with:
- Category ID
- Category Name
- Category Breadcrumb

**Multi-Location Inventory:** Track stock across warehouses:
- Available quantity
- On-hand inventory
- Damaged goods
- Safety stock
- Location-specific tracking

**Catalog Pricing:** B2B and market-specific pricing:
- Catalog-specific prices
- Inclusion/exclusion settings

### Best Practices for Products

1. **Download demo file** to understand proper formatting
2. **Keep identifiers consistent** (ID, Handle, or Title)
3. **Use REPLACE commands cautiously** - permanently deletes unmapped data
4. **Repeat rows** with identical product identifiers to add multiple variants/images
5. **Remove unused columns** to prevent unintended updates
6. **Test with small batches** before large imports

---

## Orders Import/Export

### Required Sheet Name
- **Excel:** Sheet must be named "Order" or "Orders"
- **CSV:** Any filename acceptable

### Import Limitations

#### Export-Only Fields (Cannot be imported)

These fields can only be exported, not imported back:
- Created/Updated timestamps
- Fulfillment status summaries
- Transaction IDs and messages
- Customer order counts and total spending
- Browser tracking data (IP, user agent, referrer domain)

#### Non-Updatable Fields (Set only on creation)

These can only be set when creating new orders:
- Order Name
- Customer ID
- Source Identifier and URL
- Weight Total
- Tax inclusion status
- Transaction Processed At date

### Order Commands

| Command | Behavior |
|---------|----------|
| `NEW` (default) | Create fresh orders (fails if ID/Name exists) |
| `UPDATE` | Modify specific existing order attributes |
| `MERGE` | Create if new; update if existing |
| `REPLACE` | Delete completely and rebuild from file |
| `DELETE` | Remove orders by ID or Name |
| `IGNORE` | Skip processing |

### Order Structure

- **Minimum requirement:** At least one line item per order
- **Supported line types:**
  - Standard line items (products)
  - Discounts
  - Shipping charges
  - Transactions
  - Refunds
  - Fulfillments
- **Tax entries:** Up to 100 different tax entries per order (order-level and line-item-level)

---

## Metafields Management

### What are Metafields?

Metafields are custom data fields that extend Shopify's standard data model. They can be attached to:
- Products & Variants
- Collections
- Customers
- Orders
- Pages
- Blog Posts
- Shop (store-wide settings)

### Column Naming Format

Metafield headers follow strict syntax:

```
Metafield: namespace.key [type]
```

**Examples:**
- `Metafield: custom.warranty_info [single_line_text_field]`
- `Metafield: specs.weight_limit [number_integer]`
- `Variant Metafield: custom.size_chart [url]`

### Metafield Types

#### Text Types
- `single_line_text_field` - Single line text (up to 32,767 characters in CSV)
- `multi_line_text_field` - Multi-line text
- `rich_text_field` - Shopify JSON rich text format

#### Numeric Types
- `number_integer` - Whole numbers
- `number_decimal` - Decimal numbers

#### Reference Types (Link to other Shopify entities)
- `product_reference` - Product handles or IDs
- `collection_reference` - Collection handles or IDs
- `variant_reference` - Format: `product.variant`
- `customer_reference` - Customer emails or IDs
- `metaobject_reference` - Format: `definition.entry`

#### Measurement Types
- `weight` - Weight with units (kg, lb, oz, g)
- `volume` - Volume with units (L, mL, gal, etc.)
- `dimension` - Dimensions with units (m, cm, in, ft)

#### Other Types
- `boolean` - TRUE/FALSE, yes/no, 1/0
- `date` - ISO 8601 format (YYYY-MM-DD)
- `date_time` - ISO 8601 format with time
- `color` - Hex codes (#RRGGBB)
- `money` - Amount and currency code
- `url` - Web addresses
- `link` - Internal/external links
- `json` - Valid JSON structures
- `file_reference` - File references

#### List Types
Prefix any type with `list.` for multiple values:
- `list.single_line_text_field`
- `list.product_reference`
- `list.color`

### Import Methods for Metafields

#### Method 1: By Column (Inline with Entity Data)

Add metafield columns directly to entity sheets:

| Product Handle | Title | Metafield: custom.warranty [single_line_text_field] |
|----------------|-------|------------------------------------------------------|
| laptop-pro | Laptop Pro | 2 years manufacturer warranty |

#### Method 2: By Row (Using Standard Columns)

Use dedicated metafield columns in entity sheets:

| Product Handle | Metafield Namespace | Metafield Key | Metafield Value Type | Metafield Value |
|----------------|---------------------|---------------|----------------------|-----------------|
| laptop-pro | custom | warranty | single_line_text_field | 2 years warranty |

#### Method 3: Separate Metafields Sheet

Create a dedicated "Metafields" sheet:

| Owner Type | Owner ID/Handle | Metafield Namespace | Metafield Key | Metafield Value Type | Metafield Value |
|------------|-----------------|---------------------|---------------|----------------------|-----------------|
| Product | laptop-pro | custom | warranty | single_line_text_field | 2 years warranty |

### Metafield Best Practices

1. **Namespaces:**
   - Avoid app-reserved formats: `app--<app_id>--*`
   - Use `global` namespace for general metafields (default if unspecified)
   - Use custom namespaces for organization: `custom.`, `specs.`, `seo.`

2. **Dots in Names:**
   - Escape dots with backslash: `namespace\.with\.dots.key`

3. **Empty Values:**
   - Importing blank cells **deletes** the metafield
   - Use this to clean up unwanted metafields

4. **Excel Limitations:**
   - Values exceeding 32,767 characters may be truncated
   - App warns before importing truncated values
   - Use CSV for large text values

5. **Export Filtering:**
   - Filter by namespace/key
   - Filter by type
   - Exclude empty metafields
   - "Equals to any of" or "Not equal to any of" filters

---

## Metaobjects

### What are Metaobjects?

Metaobjects are **store-level custom data structures** (introduced by Shopify) that function as reusable content types. Unlike metafields attached to specific entities, metaobjects are standalone entries.

**Use Cases:**
- Size guides
- FAQ entries
- Store policies
- Product specifications databases
- Reusable content blocks

### Managing Metaobjects with Matrixify

**Location in Shopify:** Admin → Content → Metaobjects

**Matrixify Capabilities:**
- Bulk create metaobject entries
- Update existing entries
- Export all metaobject data
- Import metaobject definitions and values

**Format:** Similar to metafields with definition and entry structure:
- `definition.entry` format for references
- Supports all metafield value types

---

## Collections, Customers, Pages, Blog Posts, Redirects

### Collections

**Smart Collections:** Automated collections based on rules/conditions
**Custom Collections:** Manually curated product collections

**Key Columns:**
- Collection ID
- Handle
- Title
- Rules (for Smart Collections)
- Products (for Custom Collections)
- Metafields

### Customers

**Import/Export:**
- Customer ID
- Email (primary identifier)
- First Name, Last Name
- Addresses
- Tags
- Customer metafields
- B2B Company associations

### Pages

**Content Pages:**
- Page ID
- Handle
- Title
- Body HTML
- SEO fields
- Page metafields

### Blog Posts

**Required Sheet Name:** "Blog Posts" or "Blog Post"

**Key Fields:**
- Blog Post ID
- Blog Handle (which blog it belongs to)
- Title
- Body HTML
- Author
- Published status
- Tags
- Blog post metafields

### Redirects

**URL Redirects (301s):**
- Used for migrating from old platforms
- Renaming product/collection handles
- SEO preservation

**Columns:**
- Redirect ID
- Path (old URL)
- Target (new URL)

**Auto-Generate Redirects:**
- Matrixify can automatically create redirects when changing handles in bulk
- Prevents broken links
- Preserves SEO rankings

---

## Automation & Integration Features

### Scheduled Imports

- **Set recurring schedules** for automatic imports
- **Flexible intervals:** Hourly, daily, weekly, monthly
- **Dynamic file naming** with date/time placeholders
- **Useful for:** Regular inventory updates, price syncs, automated feeds

### FTP/SFTP Integration

**Server Management:**
- Save server credentials securely in Matrixify
- Reuse saved servers without re-entering details
- Support for FTP and SFTP protocols

**Automated Workflows:**
- Import from FTP/SFTP at scheduled times
- Export to FTP/SFTP automatically after job completion
- Monitor folders for new files

**File Management:**
- Delete files after successful import
- Move files to different directories based on status:
  - In Progress
  - Finished
  - Failed
  - Cancelled

### Batch Import from FTP/SFTP

**Folder Monitoring:**
- Create batch import jobs that monitor a directory
- Automatically import files as they appear
- Process multiple files sequentially

**Use Cases:**
- Continuous data feeds from ERP systems
- Multi-supplier inventory updates
- Automated order imports from external systems

### Cloud Storage Integration

**Supported Services:**
- Dropbox
- Google Drive
- Google Sheets
- SharePoint
- Amazon S3 (via SFTP services)
- Any S3-compatible storage

**Integration via SFTP Services:**
- Pair Matrixify with services like **Couchdrop** or **ExaVault**
- Access cloud storage via SFTP protocol
- Bidirectional sync capabilities

### Dynamic Placeholders

Use placeholders in URLs and file paths for dynamic file naming:

**Date/Time Placeholders:**
- `{YEAR}` - 4-digit year (2024)
- `{MONTH}` - 2-digit month (01-12)
- `{DAY}` - 2-digit day (01-31)
- `{HOUR}` - 2-digit hour (00-23)
- `{MINUTE}` - 2-digit minute (00-59)

**Example:**
```
https://example.com/files/inventory_{YEAR}_{MONTH}_{DAY}.csv
```
Becomes:
```
https://example.com/files/inventory_2024_01_15.csv
```

---

## Pricing & Plans

### Demo Plan (FREE)

**Cost:** Free  
**Limits:**
- 10 imports or exports per month
- 10 items per file (products, collections, customers, etc.)

**Use Case:** Testing features on a small scale

### Basic Plan ($20/month)

**Monthly Limits per Import/Export:**
- 5,000 Products
- 300 Smart Collections
- 300 Custom Collections
- 2,000 Customers
- 50 Companies (B2B)
- 300 Discounts
- 1,000 Orders
- 1,000 Draft Orders
- 50 Pages
- 50 Blog Posts
- 10,000 Redirects
- 366 Payouts
- 10,000 Activity files
- 10,000 Regular files
- 50 Metaobjects

**Features:**
- **No monthly total limit** on number of imports/exports
- Unlimited metafields support
- Scheduled imports/exports
- FTP/SFTP and cloud storage integrations
- **1 free additional store** included

### Big Plan ($50/month)

**Monthly Limits per Import/Export:**
- 50,000 Products (10x more than Basic)
- 3,000 Smart Collections
- 3,000 Custom Collections
- 20,000 Customers
- All other limits same as Basic plan

**Features:**
- All Basic plan features
- **5x faster processing** - breaks data into 5 parallel processes
- Batch import from FTP/SFTP directories
- Ideal for medium to large stores

### Enterprise Plan ($200/month)

**Limits:**
- **UNLIMITED** imports and exports for all data types

**Features:**
- All Big plan features
- **Fastest processing speeds** - at least 10 parallel processes
- Priority support
- Ideal for enterprise stores and high-volume operations

### Important Pricing Notes

1. **Item Limits Apply per Job:** Not monthly totals
   - Can run unlimited jobs within plan limits
   - Each job must stay within item count limits

2. **Rate Limits:**
   - Maximum 20 jobs per minute per store
   - Can run 1 import AND 1 export simultaneously

3. **No Time-Based Limits:**
   - Import/export as frequently as needed
   - Only individual job size limits apply

4. **Shopify Limitations Apply:**
   - Matrixify cannot bypass Shopify's own limits
   - Plan limits are Matrixify-specific only

5. **Billing:**
   - Charged through Shopify billing
   - 30-day billing cycles
   - If canceled, access continues until end of billing period

---

## Best Practices & Safety Guidelines

### General Import Safety

1. **Test First:**
   - Always test imports with small datasets
   - Use Demo plan or test environment
   - Verify results before scaling up

2. **Understand Shopify Limitations:**
   - Review Shopify's own data limits
   - API rate limits may affect processing speed
   - Some fields have character or format restrictions

3. **Backup Data:**
   - Export current data before large imports
   - Keep backup copies of important data
   - Can use exports as restore points

4. **Review Import Checklist:**
   - Matrixify provides a safety checklist
   - Review before running critical imports
   - Contact support for complex scenarios

### Column Management

1. **Remove Unnecessary Columns:**
   - Only include columns you want to update
   - Extra columns with data will update those fields
   - Blank columns might clear existing data

2. **Header Matching:**
   - Column headers must match Matrixify templates exactly
   - Column order doesn't matter
   - Unrecognized columns are ignored

### Command Usage

1. **Use MERGE for Most Cases:**
   - Safest option for updates
   - Creates if missing, updates if exists
   - Default for most entity types

2. **Be Careful with REPLACE:**
   - Completely deletes and recreates items
   - Any data not in import file is lost
   - Use only when full replacement is intended

3. **DELETE Command:**
   - Permanently removes items
   - Cannot be undone easily
   - Double-check item identifiers before deleting

### Identifier Consistency

1. **Use Consistent Identifiers:**
   - Prefer IDs when updating existing items (most reliable)
   - Handles work for most entities (human-readable)
   - SKUs for variants

2. **Handle Changes:**
   - Changing handles can break URLs
   - Use "Auto-generate Redirects" feature
   - Preserves SEO and customer bookmarks

### Performance Optimization

1. **File Size:**
   - Use CSV for datasets over 600,000 rows
   - Excel limited to 1 million rows
   - Compress large CSV files into ZIP

2. **Parallel Processing:**
   - Available in Big and Enterprise plans
   - Significantly speeds up large imports
   - 5x faster (Big) or 10x faster (Enterprise)

3. **Batch Operations:**
   - Queue multiple jobs when possible
   - Jobs process sequentially automatically
   - Efficient use of API quota

---

## Advanced Features

### Migration Support

**Migrate from Other Platforms:**
- WordPress/WooCommerce
- Magento
- WooCommerce
- BigCommerce
- Custom platforms

**Migration Process:**
1. Export data from old platform
2. Map columns to Matrixify template
3. Import in stages (products → collections → customers → orders)
4. Use auto-redirect generation for URL preservation

### Data Feeds

**Continuous Data Feeds:**
- Set up recurring exports to external systems
- Scheduled imports from suppliers/warehouses
- Real-time-ish inventory synchronization
- Integration with ERP/WMS systems

### Multi-Store Management

**Additional Stores:**
- Basic plan includes 1 free additional store
- Big/Enterprise plans support multiple stores
- Manage data across store portfolio
- Useful for multi-brand operations

### Compliance & Security

- Secure server credential storage
- SFTP encryption support
- Cloud storage integration via secure protocols
- Activity logging for audit trails

### Import Results & Error Handling

**Detailed Results File:**
- Downloads after each import
- Contains status for every row
- "OK" for successful items
- "Failed" with detailed error messages
- Reference IDs for cross-checking

**Error Categories:**
- Format errors (incorrect data type)
- Validation errors (Shopify rules violated)
- Duplicate errors (conflicts with existing data)
- API errors (Shopify API issues)

**Error Resolution:**
1. Download Import Results file
2. Identify failed items and error reasons
3. Correct data in original file
4. Re-import only failed items

---

## Technical Specifications

### API Integration

- Built on **Shopify Admin API**
- Respects Shopify API rate limits
- Handles throttling automatically
- Sequential job processing to avoid conflicts

### Supported File Formats Summary

| Format | Extension | Max Size | Notes |
|--------|-----------|----------|-------|
| Excel | .XLSX | 5 GB (manual) / 20 GB (URL/FTP) | 1M row limit |
| CSV | .CSV | 20 GB | Recommended for large datasets |
| Zipped CSV | .ZIP | 30 GB combined | Multiple CSV files |
| Google Sheets | (link) | - | Via public sharing link |
| Shopify CSV | .CSV | 20 GB | Native Shopify format |

### Character Encoding Support

- UTF-8 (standard)
- ISO-8859-1 (Latin 1)
- ISO-2022-JP (Japanese)
- Windows-1252
- Auto-detection and conversion to UTF-8

### Browser Requirements

- Modern web browsers (Chrome, Firefox, Safari, Edge)
- Jobs run server-side (browser can be closed)
- Real-time progress updates via WebSocket

---

## Common Use Cases

### 1. Regular Inventory Updates
- **Scenario:** Update product quantities from warehouse system
- **Method:** Scheduled FTP import with CSV files
- **Frequency:** Hourly or daily
- **Columns:** Handle, Variant SKU, Variant Inventory Qty

### 2. Price Changes in Bulk
- **Scenario:** Update prices across product catalog
- **Method:** Excel file with products and new prices
- **Command:** MERGE or UPDATE
- **Columns:** Handle, Variant SKU, Variant Price, Variant Compare At Price

### 3. New Product Launch
- **Scenario:** Add 1000 new products with variants and images
- **Method:** Excel or CSV with full product data
- **Command:** NEW or MERGE
- **Includes:** Products, variants, images, metafields, collections

### 4. Platform Migration
- **Scenario:** Moving from WooCommerce to Shopify
- **Method:** Multi-stage import (products → customers → orders)
- **Features:** Auto-generate redirects, metafield mapping
- **Testing:** Demo plan for validation before full migration

### 5. SEO Metadata Updates
- **Scenario:** Add SEO metafields to all products
- **Method:** Export products, add metafield columns, re-import
- **Columns:** Handle + Metafield: global.title_tag [single_line_text_field]

### 6. Customer Data Management
- **Scenario:** Import B2B customer list with tags
- **Method:** CSV import with customer details
- **Columns:** Email, First Name, Last Name, Tags, Company

### 7. Order Import from External System
- **Scenario:** Import orders from marketplace or POS
- **Method:** Scheduled FTP import
- **Command:** NEW (to avoid duplicates)
- **Validation:** Check order names for uniqueness

### 8. Bulk Redirect Creation
- **Scenario:** Changing all product handles for SEO
- **Method:** Export products, change handles, enable auto-redirects
- **Feature:** Auto-generate redirects on handle change
- **Result:** No broken links, SEO preserved

---

## Support & Resources

### Documentation

- **Main Documentation:** https://matrixify.app/documentation/
- **Tutorials & Guides:** https://matrixify.app/tutorials/
- **How It Works:** https://matrixify.app/how-it-works/
- **Entity-Specific Guides:** Available for all 18 data types

### Template Files

- Downloadable demo files for each entity type
- Pre-configured column headers
- Example data for reference
- Available in documentation sections

### Customer Support

- Support included in all paid plans
- Contact via Shopify app dashboard
- Email support for technical questions
- Help with complex migrations (Enterprise)

### Community Resources

- Shopify Community forums
- Third-party tutorials and guides
- Video walkthroughs available
- Integration partner documentation

---

## Key Takeaways

### What Matrixify Does Best

1. **Bulk Operations at Scale:**
   - Handle millions of items efficiently
   - 20 GB file size support
   - Parallel processing for speed

2. **Flexibility:**
   - 18 different data types
   - Multiple import methods (upload, URL, FTP, cloud)
   - Comprehensive command system

3. **Automation:**
   - Scheduled imports/exports
   - FTP/SFTP monitoring
   - Batch processing
   - Cloud storage integration

4. **Metafield Management:**
   - Full metafield and metaobject support
   - Multiple import methods
   - All data types supported

5. **Safety & Control:**
   - Detailed error reporting
   - Import results file for verification
   - Job queueing and monitoring
   - Command system for precise control

### Matrixify Limitations

1. **Sequential Processing:**
   - One import/export at a time per store
   - Due to Shopify API limitations
   - Can queue jobs for automation

2. **Plan-Based Limits:**
   - Item counts limited per plan tier
   - Cannot bypass Shopify's own limitations
   - Need higher plans for larger operations

3. **No Direct API:**
   - App-based interface only
   - No programmatic API access
   - Automation via FTP/URL methods

4. **Excel Constraints:**
   - 1 million row limit
   - 32,767 character limit per cell
   - Use CSV for larger datasets

### When to Use Matrixify

✅ **Ideal For:**
- Bulk product imports/exports
- Platform migrations
- Regular inventory updates
- Price changes across catalog
- Metafield management at scale
- Order imports from external systems
- B2B customer data imports
- SEO metadata updates
- Automated data feeds
- Multi-store management

❌ **Not Ideal For:**
- Real-time individual updates (use Shopify API directly)
- Single item changes (use Shopify Admin)
- Complex data transformations (pre-process before import)
- Running multiple simultaneous imports
- Sub-second data synchronization

---

## Conclusion

Matrixify is a comprehensive solution for bulk Shopify data management, offering flexibility, power, and automation capabilities. With support for 18 data types, multiple import sources, and advanced features like scheduled imports and metafield management, it's an essential tool for:

- **Merchants** managing large product catalogs
- **Agencies** performing client migrations
- **Developers** integrating Shopify with external systems
- **Enterprise** operations requiring automation

The tiered pricing structure makes it accessible for stores of all sizes, from small businesses testing features with the free Demo plan to enterprises requiring unlimited processing power.

For detailed, entity-specific guidance, always refer to the official documentation at https://matrixify.app/documentation/.

---

**Document Version:** 1.0  
**Last Updated:** 2025-01-07  
**Based on:** Matrixify official documentation and web resources  
**Compiled by:** Claude (Anthropic AI)
