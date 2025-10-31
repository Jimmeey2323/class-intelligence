import React from 'react';

interface TableProps extends React.HTMLAttributes<HTMLTableElement> {
  children: React.ReactNode;
}

interface TableHeaderProps extends React.HTMLAttributes<HTMLTableSectionElement> {
  children: React.ReactNode;
}

interface TableBodyProps extends React.HTMLAttributes<HTMLTableSectionElement> {
  children: React.ReactNode;
}

interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  children: React.ReactNode;
}

interface TableHeadProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  children: React.ReactNode;
}

interface TableCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  children: React.ReactNode;
}

export const Table: React.FC<TableProps> = ({ children, className = '', ...props }) => {
  return (
    <div className="w-full overflow-auto">
      <table
        className={`w-full caption-bottom text-sm ${className}`}
        {...props}
      >
        {children}
      </table>
    </div>
  );
};

export const TableHeader: React.FC<TableHeaderProps> = ({ children, className = '', ...props }) => {
  return (
    <thead className={`border-b ${className}`} {...props}>
      {children}
    </thead>
  );
};

export const TableBody: React.FC<TableBodyProps> = ({ children, className = '', ...props }) => {
  return (
    <tbody className={`divide-y divide-gray-200 ${className}`} {...props}>
      {children}
    </tbody>
  );
};

export const TableRow: React.FC<TableRowProps> = ({ children, className = '', ...props }) => {
  return (
    <tr className={`border-b transition-colors hover:bg-gray-50/50 ${className}`} {...props}>
      {children}
    </tr>
  );
};

export const TableHead: React.FC<TableHeadProps> = ({ children, className = '', ...props }) => {
  return (
    <th
      className={`h-12 px-4 text-left align-middle font-medium text-gray-500 ${className}`}
      {...props}
    >
      {children}
    </th>
  );
};

export const TableCell: React.FC<TableCellProps> = ({ children, className = '', ...props }) => {
  return (
    <td className={`p-4 align-middle ${className}`} {...props}>
      {children}
    </td>
  );
};