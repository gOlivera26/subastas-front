import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

type FieldType = 'dimension' | 'value';
type PivotZone = 'rows' | 'cols' | 'vals';
type Aggregation = 'Sum' | 'Count' | 'Average';
type RowKind = 'group' | 'leaf';

interface PivotField {
  id: string;
  label: string;
  name: string;
  type: FieldType;
}

interface ValueConfig {
  id: string;
  field: PivotField;
  aggregation: Aggregation;
}

interface AggBucket {
  sum: number;
  count: number;
}

interface PivotNode {
  id: string;
  key: string;
  label: string;
  depth: number;
  fieldLabel: string;
  children: Map<string, PivotNode>;
  aggregates: Map<string, AggBucket>;
}

interface PivotColumnGroup {
  id: string;
  label: string;
  colspan: number;
}

interface PivotColumn {
  id: string;
  colKey: string;
  valueConfigId: string;
  valueLabel: string;
  aggregation: Aggregation;
}

interface PivotCell {
  id: string;
  raw: number;
  display: string;
}

interface PivotDisplayRow {
  id: string;
  label: string;
  fieldLabel: string;
  depth: number;
  kind: RowKind;
  hasChildren: boolean;
  cells: PivotCell[];
}

@Component({
  selector: 'app-pivot-table',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pivot-table.component.html',
  styles: [`
  :host {
    display: block;
    width: 100%;
    min-width: 0;
  }

  .pivot-shell {
    width: 100%;
  }

  .pivot-card {
    width: 100%;
    overflow: hidden;
    border: 1px solid color-mix(in srgb, var(--color-charcoal-grey) 86%, white 14%);
    border-radius: 18px;
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.025), rgba(255, 255, 255, 0.008)),
      var(--color-graphite);
    box-shadow:
      0 12px 34px rgba(0, 0, 0, 0.2),
      inset 0 1px 0 rgba(255, 255, 255, 0.035);
  }

  .pivot-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    padding: 18px 20px 12px;
  }

  .pivot-title-block {
    min-width: 0;
  }

  .pivot-header h2 {
    margin: 0;
    color: var(--color-porcelain);
    font-size: 20px;
    font-weight: 590;
    line-height: 1.15;
    letter-spacing: -0.025em;
  }

  .pivot-header p {
    margin: 5px 0 0;
    color: var(--color-storm-cloud);
    font-size: 12px;
    line-height: 1.45;
  }

  .pivot-count {
    flex: none;
    border: 1px solid var(--color-charcoal-grey);
    border-radius: 999px;
    background: color-mix(in srgb, var(--color-pitch-black) 50%, transparent);
    padding: 5px 9px;
    color: var(--color-fog-grey);
    font-size: 11px;
    font-weight: 510;
    line-height: 1;
  }

  .pivot-builder {
    display: grid;
    grid-template-columns: 238px minmax(0, 1fr);
    gap: 16px;
    padding: 0 20px 16px;
  }

  .pivot-fields,
  .pivot-zones {
    min-width: 0;
  }

  .section-label,
  .zone-title {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0 0 8px;
    color: var(--color-storm-cloud);
    font-size: 10px;
    font-weight: 590;
    text-transform: uppercase;
    letter-spacing: 0.16em;
  }

  .section-label {
    justify-content: space-between;
  }

  .section-label small {
    color: var(--color-fog-grey);
    font-size: 10px;
    font-weight: 510;
    letter-spacing: 0;
    text-transform: none;
  }

  .fields-box {
    min-height: 222px;
    max-height: 222px;
    overflow: auto;
    border: 1px solid var(--color-charcoal-grey);
    border-radius: 14px;
    background: rgba(0, 0, 0, 0.16);
    padding: 9px;
  }

  .field-pill {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    gap: 8px;
    margin-bottom: 7px;
    border: 1px solid color-mix(in srgb, var(--color-charcoal-grey) 84%, white 16%);
    border-radius: 999px;
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.045), rgba(255, 255, 255, 0.015)),
      color-mix(in srgb, var(--color-deep-slate) 68%, var(--color-graphite) 32%);
    padding: 6px 10px;
    color: var(--color-porcelain);
    cursor: grab;
    transition: border-color 140ms ease, background 140ms ease, transform 140ms ease;
  }

  .field-pill:last-child {
    margin-bottom: 0;
  }

  .field-pill:hover {
    transform: translateY(-1px);
    border-color: color-mix(in srgb, var(--color-cyan-spark) 45%, var(--color-charcoal-grey) 55%);
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.055), rgba(255, 255, 255, 0.018)),
      color-mix(in srgb, var(--color-deep-slate) 78%, var(--color-graphite) 22%);
  }

  .field-main {
    display: flex;
    align-items: center;
    min-width: 0;
    gap: 8px;
  }

  .field-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--color-porcelain);
    font-size: 12px;
    font-weight: 510;
  }

  .field-kind {
    flex: none;
    color: var(--color-fog-grey);
    font-size: 10px;
  }

  .field-dot,
  .zone-dot {
    width: 7px;
    height: 7px;
    flex: none;
    border-radius: 999px;
  }

  .dot-dimension,
  .rows-dot {
    background: var(--color-aether-blue);
  }

  .dot-value,
  .vals-dot {
    background: var(--color-neon-lime);
  }

  .cols-dot {
    background: var(--color-cyan-spark);
  }

  .zones-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;
  }

  .zone-block {
    min-width: 0;
  }

  .drop-zone {
    display: flex;
    flex-wrap: wrap;
    align-content: flex-start;
    gap: 8px;
    min-height: 104px;
    border: 1px dashed color-mix(in srgb, var(--color-charcoal-grey) 76%, var(--color-storm-cloud) 24%);
    border-radius: 14px;
    background: color-mix(in srgb, var(--color-graphite) 92%, black 8%);
    padding: 10px;
    transition: border-color 140ms ease, background 140ms ease, box-shadow 140ms ease;
  }

  .drop-zone-columns {
    background:
      linear-gradient(180deg, rgba(2, 184, 204, 0.035), rgba(2, 184, 204, 0.008)),
      color-mix(in srgb, var(--color-graphite) 92%, black 8%);
  }

  .drop-zone-active {
    border-color: color-mix(in srgb, var(--color-cyan-spark) 78%, white 22%);
    background:
      linear-gradient(180deg, rgba(2, 184, 204, 0.055), rgba(2, 184, 204, 0.015)),
      color-mix(in srgb, var(--color-graphite) 92%, black 8%);
    box-shadow: 0 0 0 1px rgba(2, 184, 204, 0.14);
  }

  .zone-placeholder {
    margin: auto;
    color: var(--color-fog-grey);
    font-size: 11px;
    font-style: italic;
  }

  .selected-pill {
    display: inline-flex;
    align-items: center;
    max-width: 100%;
    min-height: 27px;
    gap: 7px;
    border: 1px solid color-mix(in srgb, var(--color-charcoal-grey) 72%, white 28%);
    border-radius: 999px;
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0.018)),
      color-mix(in srgb, var(--color-deep-slate) 78%, var(--color-graphite) 22%);
    padding: 0 7px 0 10px;
    color: var(--color-porcelain);
    font-size: 12px;
    font-weight: 510;
  }

  .selected-pill span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .selected-pill button {
    display: grid;
    place-items: center;
    width: 16px;
    height: 16px;
    flex: none;
    border: 0;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.06);
    color: var(--color-fog-grey);
    cursor: pointer;
    font-size: 13px;
    line-height: 1;
  }

  .selected-pill button:hover {
    background: rgba(255, 100, 100, 0.12);
    color: #ff7b7b;
  }

  .value-pill {
    gap: 6px;
  }

  .value-pill select {
    max-width: 54px;
    border: 0;
    background: transparent;
    color: var(--color-fog-grey);
    font-size: 10px;
    outline: none;
  }

  select option {
    background: var(--color-graphite);
    color: var(--color-porcelain);
  }

  .builder-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-top: 10px;
  }

  .builder-tip {
    color: var(--color-fog-grey);
    font-size: 11px;
  }

  .drop-message {
    color: #f87171;
    font-size: 11px;
  }

  .reset-btn {
    border: 0;
    border-radius: 8px;
    background: transparent;
    color: var(--color-fog-grey);
    padding: 6px 8px;
    font-size: 11px;
    cursor: pointer;
    transition: background 140ms ease, color 140ms ease;
  }

  .reset-btn:hover {
    background: rgba(255, 255, 255, 0.05);
    color: var(--color-porcelain);
  }

  .smart-section {
    padding: 0 20px 20px;
  }

  .smart-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    margin-bottom: 10px;
  }

  .smart-header h3 {
    margin: 0;
    color: var(--color-porcelain);
    font-size: 16px;
    font-weight: 590;
    letter-spacing: -0.015em;
  }

  .smart-meta {
    display: flex;
    align-items: center;
    gap: 7px;
    color: var(--color-fog-grey);
    font-size: 10px;
    font-weight: 510;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .smart-table-wrap {
    max-height: 360px;
    overflow: auto;
    border: 1px solid var(--color-charcoal-grey);
    border-radius: 14px;
    background: rgba(0, 0, 0, 0.12);
  }

  .smart-table {
    width: 100%;
    min-width: 720px;
    border-collapse: separate;
    border-spacing: 0;
    color: var(--color-storm-cloud);
    font-size: 12px;
  }

  .smart-table thead th {
    position: sticky;
    top: 0;
    z-index: 5;
    border-bottom: 1px solid var(--color-charcoal-grey);
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.035), rgba(255, 255, 255, 0.012)),
      color-mix(in srgb, var(--color-deep-slate) 88%, var(--color-graphite) 12%);
  }

  .dimension-head {
    width: 42%;
    padding: 10px 12px;
    text-align: left;
    color: var(--color-storm-cloud);
    font-size: 10px;
    font-weight: 590;
    text-transform: uppercase;
    letter-spacing: 0.14em;
  }

  .group-head {
    padding: 8px 12px 3px;
    text-align: right;
    color: var(--color-porcelain);
    font-size: 11px;
    font-weight: 590;
  }

  .metric-head {
    padding: 0 12px 8px;
    text-align: right;
    color: var(--color-storm-cloud);
  }

  .metric-head span {
    display: block;
    font-size: 10px;
    font-weight: 590;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .metric-head small {
    display: block;
    margin-top: 2px;
    color: var(--color-fog-grey);
    font-size: 9px;
    text-transform: uppercase;
  }

  .smart-table tbody tr {
    transition: background 140ms ease;
  }

  .smart-table tbody tr:hover {
    background: rgba(255, 255, 255, 0.035);
  }

  .row-alt {
    background: rgba(255, 255, 255, 0.018);
  }

  .row-group {
    background: rgba(255, 255, 255, 0.028);
  }

  .dimension-cell {
    padding: 8px 12px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.03);
    color: var(--color-porcelain);
  }

  .dimension-content {
    display: flex;
    align-items: center;
    min-width: 0;
    gap: 8px;
  }

  .dimension-text {
    min-width: 0;
  }

  .dimension-content strong {
    display: block;
    overflow: hidden;
    color: var(--color-porcelain);
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 12px;
    font-weight: 510;
    line-height: 1.12;
  }

  .dimension-content small {
    display: block;
    margin-top: 3px;
    color: var(--color-fog-grey);
    font-size: 9px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .toggle-btn,
  .toggle-spacer {
    width: 18px;
    height: 18px;
    flex: none;
  }

  .toggle-btn {
    border: 0;
    border-radius: 6px;
    background: transparent;
    color: var(--color-fog-grey);
    cursor: pointer;
    font-size: 16px;
    line-height: 1;
  }

  .toggle-btn:hover {
    background: rgba(2, 184, 204, 0.08);
    color: var(--color-cyan-spark);
  }

  .metric-cell {
    padding: 8px 12px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.03);
    text-align: right;
    color: var(--color-storm-cloud);
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 12px;
  }

  .total-label,
  .total-cell {
    position: sticky;
    bottom: 0;
    z-index: 6;
    border-top: 1px solid var(--color-charcoal-grey);
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.035), rgba(255, 255, 255, 0.012)),
      color-mix(in srgb, var(--color-deep-slate) 88%, var(--color-graphite) 12%);
    padding: 9px 12px;
    font-size: 12px;
    font-weight: 590;
  }

  .total-label {
    color: var(--color-porcelain);
  }

  .total-cell {
    text-align: right;
    color: var(--color-cyan-spark);
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  }

  .pivot-empty {
    display: grid;
    min-height: 140px;
    place-items: center;
    color: var(--color-storm-cloud);
    font-size: 13px;
    text-align: center;
  }

  .pivot-empty.small {
    min-height: 120px;
  }

  .fields-empty {
    display: grid;
    height: 120px;
    place-items: center;
    color: var(--color-fog-grey);
    font-size: 11px;
    font-style: italic;
  }

  ::-webkit-scrollbar {
    width: 7px;
    height: 7px;
  }

  ::-webkit-scrollbar-track {
    background: transparent;
  }

  ::-webkit-scrollbar-thumb {
    border-radius: 999px;
    background: var(--color-charcoal-grey);
  }

  ::-webkit-scrollbar-thumb:hover {
    background: var(--color-storm-cloud);
  }

  @media (max-width: 1080px) {
    .pivot-builder {
      grid-template-columns: 1fr;
    }

    .zones-grid {
      grid-template-columns: 1fr;
    }

    .builder-footer {
      align-items: flex-start;
      flex-direction: column;
    }
  }

  @media (max-width: 640px) {
    .pivot-header {
      flex-direction: column;
    }

    .pivot-builder,
    .smart-section {
      padding-left: 14px;
      padding-right: 14px;
    }

    .pivot-header {
      padding-left: 14px;
      padding-right: 14px;
    }
  }
`],
})
export class PivotTableComponent implements OnChanges {
  @Input() data: any[] = [];

  rawData: any[] = [];
  allFields: PivotField[] = [];

  userRows: PivotField[] = [];
  userCols: PivotField[] = [];
  userValues: ValueConfig[] = [];

  columnGroups: PivotColumnGroup[] = [];
  leafColumns: PivotColumn[] = [];
  displayRows: PivotDisplayRow[] = [];
  totalCells: PivotCell[] = [];

  dragOverZone: PivotZone | null = null;
  dropMessage = '';

  private readonly ALL = '__all__';
  private readonly SEP = '\u001F';

  private dragField: PivotField | null = null;
  private rootNode: PivotNode | null = null;
  private collapsed = new Set<string>();
  private columnMaxes: number[] = [];
  private initialized = false;
  private dropMessageTimer: ReturnType<typeof setTimeout> | null = null;

  get rowFields(): PivotField[] {
    return this.userRows;
  }

  get colFields(): PivotField[] {
    return this.userCols;
  }

  get valueFields(): ValueConfig[] {
    return this.userValues;
  }

  get availableFields(): PivotField[] {
    const used = new Set<string>([
      ...this.userRows.map(field => field.name),
      ...this.userCols.map(field => field.name),
      ...this.userValues.map(value => value.field.name),
    ]);

    return this.allFields.filter(field => !used.has(field.name));
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['data']) {
      this.rawData = Array.isArray(this.data) ? this.data : [];
      this.rebuild();
    }
  }

  private rebuild() {
    this.allFields = this.detectFields();

    if (this.rawData.length === 0 || this.allFields.length === 0) {
      this.initialized = false;
      this.userRows = [];
      this.userCols = [];
      this.userValues = [];
      this.clearPivot();
      return;
    }

    if (!this.initialized) {
      this.applyDefaultConfig();
      this.initialized = true;
    } else {
      this.reconcileConfig();
    }

    this.computePivot();
  }

  private detectFields(): PivotField[] {
    const sample = this.rawData[0] ?? {};

    return Object.keys(sample).map((key, index) => ({
      id: `field-${index}-${this.slug(key)}`,
      label: key,
      name: key,
      type: this.detectFieldType(key),
    }));
  }

  private detectFieldType(key: string): FieldType {
    const values = this.rawData
      .map(row => row?.[key])
      .filter(value => value !== null && value !== undefined && value !== '')
      .slice(0, 25);

    if (values.length === 0) {
      return 'dimension';
    }

    const numericCount = values.filter(value => this.toNumber(value) !== null).length;
    return numericCount === values.length ? 'value' : 'dimension';
  }

  private applyDefaultConfig() {
    const dimensions = this.allFields.filter(field => field.type === 'dimension');
    const values = this.allFields.filter(field => field.type === 'value');

    const cotizacion = this.findField('COTIZACION') ?? dimensions[0];
    const item = this.findField('ITEM');
    const proveedor = this.findField('PROVEEDOR') ?? dimensions.find(field => field.name !== cotizacion?.name);

    this.userRows = this.uniqueFields([cotizacion, item].filter(Boolean) as PivotField[]);
    this.userCols = proveedor ? [proveedor] : [];

    const subastado = this.findField('SUBASTADO');
    const ahorrado = this.findField('AHORRADO');
    const presupuestado = this.findField('PRESUPUESTADO');

    const defaultValues = this.uniqueFields(
      [subastado, ahorrado, presupuestado, values[0]].filter(Boolean) as PivotField[],
    ).slice(0, 2);

    this.userValues = defaultValues.map(field => this.createValueConfig(field, 'Sum'));

    if (this.userValues.length === 0 && values[0]) {
      this.userValues = [this.createValueConfig(values[0], 'Sum')];
    }
  }

  private reconcileConfig() {
    const byName = new Map(this.allFields.map(field => [field.name, field]));

    this.userRows = this.userRows
      .map(field => byName.get(field.name))
      .filter(Boolean) as PivotField[];

    this.userCols = this.userCols
      .map(field => byName.get(field.name))
      .filter(Boolean) as PivotField[];

    this.userValues = this.userValues
      .map(value => {
        const field = byName.get(value.field.name);
        return field?.type === 'value' ? this.createValueConfig(field, value.aggregation) : null;
      })
      .filter(Boolean) as ValueConfig[];

    if (this.userValues.length === 0) {
      const firstValue = this.allFields.find(field => field.type === 'value');
      if (firstValue) {
        this.userValues = [this.createValueConfig(firstValue, 'Sum')];
      }
    }
  }

  private clearPivot() {
    this.rootNode = null;
    this.columnGroups = [];
    this.leafColumns = [];
    this.displayRows = [];
    this.totalCells = [];
    this.columnMaxes = [];
  }

  private computePivot() {
    this.clearPivot();

    if (this.rawData.length === 0 || this.userValues.length === 0) {
      return;
    }

    const root = this.createNode('root', 'Total General', -1, 'Total');
    const columnLabels = new Map<string, string>();

    for (const record of this.rawData) {
      const rowParts = this.userRows.map(field => this.normalizeDimension(record?.[field.name]));
      const colParts = this.userCols.map(field => this.normalizeDimension(record?.[field.name]));

      const colKey = colParts.length > 0 ? colParts.join(this.SEP) : this.ALL;
      const colLabel = colParts.length > 0 ? colParts.join(' · ') : 'Total';

      columnLabels.set(colKey, colLabel);
      this.updateAggregates(root, record, colKey);

      let current = root;

      for (let depth = 0; depth < rowParts.length; depth++) {
        const label = rowParts[depth];
        const key = current.key === 'root' ? label : `${current.key}${this.SEP}${label}`;

        let child = current.children.get(label);

        if (!child) {
          child = this.createNode(
            key,
            label,
            depth,
            this.userRows[depth]?.label ?? 'Dimensión',
          );

          current.children.set(label, child);
        }

        this.updateAggregates(child, record, colKey);
        current = child;
      }
    }

    if (columnLabels.size === 0) {
      columnLabels.set(this.ALL, 'Total');
    }

    this.rootNode = root;
    this.buildColumns(columnLabels);
    this.buildRows();
    this.buildTotals();
    this.buildColumnMaxes();
  }

  private buildColumns(columnLabels: Map<string, string>) {
    const sortedColumns = Array.from(columnLabels.entries()).sort((a, b) =>
      a[1].localeCompare(b[1], 'es', { numeric: true, sensitivity: 'base' }),
    );

    this.columnGroups = sortedColumns.map(([key, label]) => ({
      id: `group-${this.slug(key)}`,
      label,
      colspan: this.userValues.length,
    }));

    this.leafColumns = [];

    for (const [colKey] of sortedColumns) {
      for (const value of this.userValues) {
        this.leafColumns.push({
          id: `col-${this.slug(colKey)}-${value.id}`,
          colKey,
          valueConfigId: value.id,
          valueLabel: value.field.label,
          aggregation: value.aggregation,
        });
      }
    }
  }

  private buildRows() {
    if (!this.rootNode) {
      this.displayRows = [];
      return;
    }

    if (this.userRows.length === 0) {
      this.displayRows = [this.nodeToRow(this.rootNode, 'leaf')];
      return;
    }

    const rows: PivotDisplayRow[] = [];

    const visit = (node: PivotNode) => {
      const children = Array.from(node.children.values()).sort((a, b) =>
        a.label.localeCompare(b.label, 'es', { numeric: true, sensitivity: 'base' }),
      );

      for (const child of children) {
        const hasChildren = child.children.size > 0;
        rows.push(this.nodeToRow(child, hasChildren ? 'group' : 'leaf'));

        if (hasChildren && !this.collapsed.has(child.id)) {
          visit(child);
        }
      }
    };

    visit(this.rootNode);
    this.displayRows = rows;
  }

  private buildTotals() {
    if (!this.rootNode) {
      this.totalCells = [];
      return;
    }

    this.totalCells = this.leafColumns.map(column => this.cellFor(this.rootNode!, column));
  }

  private buildColumnMaxes() {
    this.columnMaxes = this.leafColumns.map((_, index) => {
      const rowMax = this.displayRows.reduce((max, row) => {
        return Math.max(max, Math.abs(row.cells[index]?.raw ?? 0));
      }, 0);

      const totalMax = Math.abs(this.totalCells[index]?.raw ?? 0);
      return Math.max(rowMax, totalMax);
    });
  }

  private nodeToRow(node: PivotNode, kind: RowKind): PivotDisplayRow {
    return {
      id: node.id,
      label: node.label,
      fieldLabel: node.fieldLabel,
      depth: Math.max(0, node.depth),
      kind,
      hasChildren: node.children.size > 0,
      cells: this.leafColumns.map(column => this.cellFor(node, column)),
    };
  }

  private cellFor(node: PivotNode, column: PivotColumn): PivotCell {
    const value = this.userValues.find(v => v.id === column.valueConfigId);
    const aggregation = value?.aggregation ?? column.aggregation;
    const bucket = node.aggregates.get(this.metricKey(column.colKey, column.valueConfigId));
    const raw = this.resolveBucket(bucket, aggregation);

    return {
      id: `cell-${node.id}-${column.id}`,
      raw,
      display: this.formatNumber(raw, aggregation, column.valueLabel),
    };
  }

  private updateAggregates(node: PivotNode, record: any, colKey: string) {
    for (const value of this.userValues) {
      const key = this.metricKey(colKey, value.id);
      const bucket = node.aggregates.get(key) ?? { sum: 0, count: 0 };

      const rawValue = record?.[value.field.name];
      const numericValue = this.toNumber(rawValue);

      if (value.aggregation === 'Count') {
        if (rawValue !== null && rawValue !== undefined && rawValue !== '') {
          bucket.count += 1;
        }
      } else if (numericValue !== null) {
        bucket.sum += numericValue;
        bucket.count += 1;
      }

      node.aggregates.set(key, bucket);
    }
  }

  private resolveBucket(bucket: AggBucket | undefined, aggregation: Aggregation): number {
    if (!bucket) {
      return 0;
    }

    if (aggregation === 'Count') {
      return bucket.count;
    }

    if (aggregation === 'Average') {
      return bucket.count === 0 ? 0 : bucket.sum / bucket.count;
    }

    return bucket.sum;
  }

  private createNode(key: string, label: string, depth: number, fieldLabel: string): PivotNode {
    return {
      id: `node-${this.slug(key || 'root')}`,
      key,
      label,
      depth,
      fieldLabel,
      children: new Map<string, PivotNode>(),
      aggregates: new Map<string, AggBucket>(),
    };
  }

  private createValueConfig(field: PivotField, aggregation: Aggregation): ValueConfig {
    return {
      id: `value-${this.slug(field.name)}-${aggregation.toLowerCase()}`,
      field,
      aggregation,
    };
  }

  private metricKey(colKey: string, valueConfigId: string): string {
    return `${colKey}${this.SEP}${valueConfigId}`;
  }

  private findField(name: string): PivotField | undefined {
    return this.allFields.find(field => field.name.toUpperCase() === name.toUpperCase());
  }

  private uniqueFields(fields: PivotField[]): PivotField[] {
    const seen = new Set<string>();
    const result: PivotField[] = [];

    for (const field of fields) {
      if (!seen.has(field.name)) {
        seen.add(field.name);
        result.push(field);
      }
    }

    return result;
  }

  private normalizeDimension(value: any): string {
    if (value === null || value === undefined || value === '') {
      return '(vacío)';
    }

    return String(value);
  }

  private toNumber(value: any): number | null {
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : null;
    }

    if (typeof value === 'string') {
      const normalized = value
        .replace(/\s/g, '')
        .replace(/\./g, '')
        .replace(',', '.');

      const parsed = Number(normalized);
      return Number.isFinite(parsed) ? parsed : null;
    }

    return null;
  }

  private formatNumber(value: number, aggregation: Aggregation, label: string): string {
    if (aggregation === 'Count') {
      return value.toLocaleString('es-MX', { maximumFractionDigits: 0 });
    }

    const formatted = value.toLocaleString('es-MX', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    return label.includes('%') ? `${formatted}%` : formatted;
  }

  private slug(value: string): string {
    return String(value)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase()
      .slice(0, 80) || 'x';
  }

  quickAdd(field: PivotField) {
    if (field.type === 'value') {
      this.addFieldToZone(field, 'vals');
      return;
    }

    if (this.userRows.length === 0) {
      this.addFieldToZone(field, 'rows');
      return;
    }

    this.addFieldToZone(field, 'cols');
  }

  onDragStart(event: DragEvent, field: PivotField) {
    this.dragField = field;
    event.dataTransfer?.setData('text/plain', field.id);

    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
    }
  }

  onDragOver(event: DragEvent, zone: PivotZone) {
    event.preventDefault();

    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }

    this.dragOverZone = zone;
  }

  onDragLeave() {
    this.dragOverZone = null;
  }

  onDrop(event: DragEvent, zone: PivotZone) {
    event.preventDefault();
    this.dragOverZone = null;

    if (!this.dragField) {
      return;
    }

    this.addFieldToZone(this.dragField, zone);
    this.dragField = null;
  }

  private addFieldToZone(field: PivotField, zone: PivotZone) {
    this.dropMessage = '';

    if (zone === 'vals' && field.type !== 'value') {
      this.showDropMessage('Solo podés usar campos numéricos en Valores.');
      return;
    }

    this.removeFieldEverywhere(field.name);

    if (zone === 'rows') {
      this.userRows = [...this.userRows, field];
    }

    if (zone === 'cols') {
      this.userCols = [...this.userCols, field];
    }

    if (zone === 'vals') {
      this.userValues = [...this.userValues, this.createValueConfig(field, 'Sum')];
    }

    this.collapsed.clear();
    this.computePivot();
  }

  private removeFieldEverywhere(fieldName: string) {
    this.userRows = this.userRows.filter(field => field.name !== fieldName);
    this.userCols = this.userCols.filter(field => field.name !== fieldName);
    this.userValues = this.userValues.filter(value => value.field.name !== fieldName);
  }

  removeRow(index: number) {
    this.userRows = this.userRows.filter((_, i) => i !== index);
    this.collapsed.clear();
    this.computePivot();
  }

  removeCol(index: number) {
    this.userCols = this.userCols.filter((_, i) => i !== index);
    this.collapsed.clear();
    this.computePivot();
  }

  removeValue(index: number) {
    this.userValues = this.userValues.filter((_, i) => i !== index);
    this.computePivot();
  }

  setValueAggregation(valueConfigId: string, aggregation: string) {
    const safeAggregation = this.asAggregation(aggregation);

    this.userValues = this.userValues.map(value => {
      if (value.id !== valueConfigId) {
        return value;
      }

      return this.createValueConfig(value.field, safeAggregation);
    });

    this.computePivot();
  }

  private asAggregation(value: string): Aggregation {
    if (value === 'Count') return 'Count';
    if (value === 'Average') return 'Average';
    return 'Sum';
  }

  resetAll() {
    this.collapsed.clear();
    this.applyDefaultConfig();
    this.computePivot();
  }

  toggle(rowId: string) {
    if (this.collapsed.has(rowId)) {
      this.collapsed.delete(rowId);
    } else {
      this.collapsed.add(rowId);
    }

    this.buildRows();
    this.buildTotals();
    this.buildColumnMaxes();
  }

  isCollapsed(rowId: string): boolean {
    return this.collapsed.has(rowId);
  }

  cellBackground(value: number, columnIndex: number): string | null {
    const max = this.columnMaxes[columnIndex] ?? 0;

    if (!max || !value) {
      return null;
    }

    const ratio = Math.min(1, Math.abs(value) / max);
    const opacity = Math.max(0.05, ratio * 0.18);

    return `linear-gradient(90deg, rgba(2, 184, 204, ${opacity}) 0%, rgba(2, 184, 204, ${opacity * 0.18}) 100%)`;
  }

  private showDropMessage(message: string) {
    this.dropMessage = message;

    if (this.dropMessageTimer) {
      clearTimeout(this.dropMessageTimer);
    }

    this.dropMessageTimer = setTimeout(() => {
      this.dropMessage = '';
    }, 2500);
  }
}