import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from './ui/table';
import { 
  Plus,
  Trash2, 
  Save, 
  Undo, 
  Redo,
  X,
  FileSpreadsheet,
  Edit3,
  Search
} from 'lucide-react';
import { useToast } from '../hooks/use-toast';

interface CsvRow {
  [key: string]: string;
}

interface CsvEditorProps {
  csvContent: string;
  fileName: string;
  onSave: (modifiedCsv: string, fileName: string) => void;
  onClose: () => void;
}

export function CsvEditor({ csvContent, fileName, onSave, onClose }: CsvEditorProps) {
  const [data, setData] = useState<CsvRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [editingCell, setEditingCell] = useState<{ row: number; col: string } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [history, setHistory] = useState<CsvRow[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [rawCsvText, setRawCsvText] = useState(csvContent);
  const [activeTab, setActiveTab] = useState<'table' | 'raw'>('table');
  const { toast } = useToast();

  useEffect(() => {
    parseCsvContent(csvContent);
  }, [csvContent]);

  const parseCsvContent = (content: string) => {
    try {
      const lines = content.split('\n').filter(line => line.trim());
      if (lines.length === 0) return;

      // Parse header row
      const headerLine = lines[0];
      const parsedHeaders = parseCSVLine(headerLine);
      setHeaders(parsedHeaders);

      // Parse data rows
      const parsedData = lines.slice(1).map((line) => {
        const values = parseCSVLine(line);
        const row: CsvRow = {};
        parsedHeaders.forEach((header, i) => {
          row[header] = values[i] || '';
        });
        return row;
      }).filter(row => {
        // Filter out rows that don't have a trainer name
        // Look for trainer-related columns (case insensitive)
        const trainerColumns = parsedHeaders.filter(header => 
          header.toLowerCase().includes('trainer') || 
          header.toLowerCase().includes('instructor') ||
          header.toLowerCase().includes('teacher')
        );
        
        // If we found trainer columns, check if at least one has a value
        if (trainerColumns.length > 0) {
          return trainerColumns.some(col => row[col] && row[col].trim() !== '');
        }
        
        // If no trainer columns found, include all non-empty rows
        return Object.values(row).some(value => value.trim());
      });

      setData(parsedData);
      
      // Initialize history
      const initialState = JSON.parse(JSON.stringify(parsedData));
      setHistory([initialState]);
      setHistoryIndex(0);
      
      toast({
        title: "CSV Loaded",
        description: `Successfully loaded ${parsedData.length} rows with ${parsedHeaders.length} columns (filtered out classes without trainers)`,
        variant: "default",
      });
    } catch (error) {
      console.error('Error parsing CSV:', error);
      toast({
        title: "Parse Error",
        description: "Failed to parse CSV content. Please check the format.",
        variant: "destructive",
      });
    }
  };

  const parseCSVLine = (line: string): string[] => {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result;
  };

  const addToHistory = (newData: CsvRow[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(JSON.parse(JSON.stringify(newData)));
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const updateCell = (rowIndex: number, columnKey: string, value: string) => {
    const newData = data.map((row, index) => 
      index === rowIndex ? { ...row, [columnKey]: value } : row
    );
    setData(newData);
    addToHistory(newData);
    setEditingCell(null);
  };

  const addRow = () => {
    const newRow: CsvRow = {};
    headers.forEach(header => {
      newRow[header] = '';
    });
    const newData = [...data, newRow];
    setData(newData);
    addToHistory(newData);
  };

  const deleteRow = (index: number) => {
    const newData = data.filter((_, i) => i !== index);
    setData(newData);
    addToHistory(newData);
  };

  const addColumn = () => {
    const columnName = prompt('Enter column name:');
    if (!columnName || headers.includes(columnName)) {
      toast({
        title: "Invalid Column",
        description: "Column name is empty or already exists",
        variant: "destructive",
      });
      return;
    }

    const newHeaders = [...headers, columnName];
    const newData = data.map(row => ({ ...row, [columnName]: '' }));
    
    setHeaders(newHeaders);
    setData(newData);
    addToHistory(newData);
  };

  const deleteColumn = (columnKey: string) => {
    if (headers.length <= 1) {
      toast({
        title: "Cannot Delete",
        description: "Cannot delete the last remaining column",
        variant: "destructive",
      });
      return;
    }

    const newHeaders = headers.filter(h => h !== columnKey);
    const newData = data.map(row => {
      const { [columnKey]: _, ...rest } = row;
      return rest;
    });
    
    setHeaders(newHeaders);
    setData(newData);
    addToHistory(newData);
  };

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setData(history[historyIndex - 1]);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setData(history[historyIndex + 1]);
    }
  };

  const exportToCsv = () => {
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => {
        const value = row[header] || '';
        // Escape quotes and wrap in quotes if contains comma or quote
        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(','))
    ].join('\n');

    setRawCsvText(csvContent);
    onSave(csvContent, fileName.replace('.csv', '_edited.csv'));
  };

  const handleRawTextSave = () => {
    try {
      parseCsvContent(rawCsvText);
      onSave(rawCsvText, fileName.replace('.csv', '_edited.csv'));
    } catch (error) {
      toast({
        title: "Invalid CSV",
        description: "Please check your CSV syntax",
        variant: "destructive",
      });
    }
  };

  const filteredData = data.filter(row => {
    if (!searchTerm) return true;
    return Object.values(row).some(value => 
      value.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const renderToolbar = () => (
    <div className="flex flex-wrap items-center gap-2 p-4 bg-gray-50 border-b">
      <div className="flex items-center gap-1 mr-4">
        <Button variant="outline" size="sm" onClick={addRow}>
          <Plus className="h-4 w-4 mr-1" />
          Add Row
        </Button>
        <Button variant="outline" size="sm" onClick={addColumn}>
          <Plus className="h-4 w-4 mr-1" />
          Add Column
        </Button>
      </div>

      <div className="flex items-center gap-1 mr-4">
        <Button
          variant="outline"
          size="sm"
          onClick={undo}
          disabled={historyIndex <= 0}
        >
          <Undo className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={redo}
          disabled={historyIndex >= history.length - 1}
        >
          <Redo className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex items-center gap-2 mr-4">
        <Search className="h-4 w-4 text-gray-500" />
        <Input
          placeholder="Search..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-48"
        />
      </div>

      <div className="flex items-center gap-1 ml-auto">
        <Button variant="outline" size="sm" onClick={exportToCsv}>
          <Save className="h-4 w-4 mr-1" />
          Save Changes
        </Button>
        <Button variant="outline" size="sm" onClick={onClose}>
          <X className="h-4 w-4 mr-1" />
          Close
        </Button>
      </div>
    </div>
  );

  const renderTableView = () => (
    <div className="flex-1 p-4">
      <ScrollArea className="h-96">
        <Table>
          <TableHeader className="sticky top-0 bg-white z-10">
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              {headers.map((header) => (
                <TableHead key={header} className="min-w-32">
                  <div className="flex items-center justify-between">
                    <span>{header}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteColumn(header)}
                      className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </TableHead>
              ))}
              <TableHead className="w-12">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.map((row) => {
              const originalIndex = data.findIndex(dataRow => dataRow === row);
              return (
                <TableRow key={originalIndex}>
                  <TableCell className="font-medium text-gray-500">
                    {originalIndex + 1}
                  </TableCell>
                  {headers.map((header) => (
                    <TableCell key={header} className="p-1">
                      {editingCell?.row === originalIndex && editingCell?.col === header ? (
                        <Input
                          value={row[header] || ''}
                          onChange={(e) => updateCell(originalIndex, header, e.target.value)}
                          onBlur={() => setEditingCell(null)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              setEditingCell(null);
                            }
                            if (e.key === 'Escape') {
                              setEditingCell(null);
                            }
                          }}
                          autoFocus
                          className="w-full"
                        />
                      ) : (
                        <div
                          className="min-h-9 p-2 cursor-pointer hover:bg-gray-50 rounded border border-transparent hover:border-gray-300"
                          onClick={() => setEditingCell({ row: originalIndex, col: header })}
                        >
                          {row[header] || (
                            <span className="text-gray-400 italic">Empty</span>
                          )}
                        </div>
                      )}
                    </TableCell>
                  ))}
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteRow(originalIndex)}
                      className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </ScrollArea>

      {filteredData.length === 0 && searchTerm && (
        <div className="text-center py-8">
          <Search className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-500">No rows match your search term "{searchTerm}"</p>
        </div>
      )}

      {data.length === 0 && (
        <div className="text-center py-8">
          <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-500">No data to display</p>
          <Button onClick={addRow} className="mt-2">
            <Plus className="h-4 w-4 mr-2" />
            Add First Row
          </Button>
        </div>
      )}
    </div>
  );

  const renderRawView = () => (
    <div className="flex-1 p-4">
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold">Raw CSV Content</h3>
          <Button onClick={handleRawTextSave} size="sm">
            <Save className="h-4 w-4 mr-2" />
            Save Raw Changes
          </Button>
        </div>
        <p className="text-sm text-gray-600">
          Edit the CSV content directly. Changes will be parsed when you save.
        </p>
      </div>
      
      <Textarea
        value={rawCsvText}
        onChange={(e) => setRawCsvText(e.target.value)}
        className="w-full h-96 font-mono text-sm"
        placeholder="Paste your CSV content here..."
      />
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-2xl max-w-[95vw] max-h-[95vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
              <FileSpreadsheet className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold">CSV Editor</h2>
              <p className="text-sm text-gray-600">{fileName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              {data.length} rows × {headers.length} columns
            </Badge>
          </div>
        </div>

        {renderToolbar()}

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-2 mx-4 mt-4">
            <TabsTrigger value="table" className="flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              Table View
            </TabsTrigger>
            <TabsTrigger value="raw" className="flex items-center gap-2">
              <Edit3 className="h-4 w-4" />
              Raw Text
            </TabsTrigger>
          </TabsList>

          <TabsContent value="table" className="flex-1 flex flex-col">
            {renderTableView()}
          </TabsContent>

          <TabsContent value="raw" className="flex-1 flex flex-col">
            {renderRawView()}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}