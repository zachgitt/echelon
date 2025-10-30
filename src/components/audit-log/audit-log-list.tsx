'use client';

import { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { AuditLogWithDetails } from '@/lib/audit/queries';

interface AuditLogListProps {
  organizationId: string;
}

export function AuditLogList({ organizationId }: AuditLogListProps) {
  const [logs, setLogs] = useState<AuditLogWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 50,
    totalPages: 0,
  });

  // Filters
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>('all');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [searchFilter, setSearchFilter] = useState<string>('');

  useEffect(() => {
    fetchAuditLogs();
  }, [organizationId, pagination.page, entityTypeFilter, actionFilter]);

  const fetchAuditLogs = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        organizationId,
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });

      if (entityTypeFilter !== 'all') {
        params.append('entityType', entityTypeFilter);
      }

      if (actionFilter !== 'all') {
        params.append('action', actionFilter);
      }

      if (searchFilter) {
        params.append('search', searchFilter);
      }

      const response = await fetch(`/api/audit-logs?${params}`);

      if (!response.ok) {
        throw new Error('Failed to fetch audit logs');
      }

      const data = await response.json();
      setLogs(data.logs);
      setPagination(data.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPagination((prev) => ({ ...prev, page: 1 }));
    fetchAuditLogs();
  };

  const getActionBadgeVariant = (action: string) => {
    switch (action) {
      case 'created':
        return 'default';
      case 'updated':
        return 'secondary';
      case 'deleted':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const renderChangeDetails = (log: AuditLogWithDetails) => {
    const { action, previousValues, newValues } = log;

    if (action === 'created') {
      return (
        <div className="mt-2 space-y-1 text-sm">
          <p className="text-muted-foreground">New employee created</p>
          {newValues && (
            <div className="ml-4 space-y-1">
              {Object.entries(newValues).map(([key, value]) => (
                <div key={key} className="flex gap-2">
                  <span className="font-medium">{formatFieldName(key)}:</span>
                  <span>{formatFieldValue(value)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    if (action === 'deleted') {
      return (
        <div className="mt-2 text-sm">
          <p className="text-muted-foreground">Employee terminated</p>
        </div>
      );
    }

    if (action === 'updated' && previousValues && newValues) {
      const changedFields = Object.keys(newValues);

      if (changedFields.length === 0) {
        return null;
      }

      return (
        <div className="mt-2 space-y-2 text-sm">
          {changedFields.map((field) => (
            <div key={field} className="flex gap-2">
              <span className="font-medium text-muted-foreground">
                {formatFieldName(field)}:
              </span>
              <span className="text-red-600 line-through">
                {formatFieldValue(previousValues[field])}
              </span>
              <span>→</span>
              <span className="text-green-600">
                {formatFieldValue(newValues[field])}
              </span>
            </div>
          ))}
        </div>
      );
    }

    return null;
  };

  const formatFieldName = (field: string): string => {
    const fieldMap: Record<string, string> = {
      name: 'Name',
      email: 'Email',
      title: 'Title',
      departmentId: 'Department',
      managerId: 'Manager',
      hireDate: 'Hire Date',
      salary: 'Salary',
      status: 'Status',
    };
    return fieldMap[field] || field;
  };

  const formatFieldValue = (value: any): string => {
    if (value === null || value === undefined) {
      return 'None';
    }

    if (typeof value === 'string' && value.includes('T')) {
      // Likely a date
      try {
        return new Date(value).toLocaleDateString();
      } catch {
        return value;
      }
    }

    return String(value);
  };

  if (loading && logs.length === 0) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <Card key={i} className="p-4">
            <Skeleton className="h-6 w-3/4 mb-2" />
            <Skeleton className="h-4 w-1/2" />
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
        <p className="font-medium">Error loading audit logs</p>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card className="p-4">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="entityType">Entity Type</Label>
              <Select
                value={entityTypeFilter}
                onValueChange={(value) => {
                  setEntityTypeFilter(value);
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
              >
                <SelectTrigger id="entityType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="employee">Employee</SelectItem>
                  <SelectItem value="department">Department</SelectItem>
                  <SelectItem value="organization">Organization</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="action">Action</Label>
              <Select
                value={actionFilter}
                onValueChange={(value) => {
                  setActionFilter(value);
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
              >
                <SelectTrigger id="action">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  <SelectItem value="created">Created</SelectItem>
                  <SelectItem value="updated">Updated</SelectItem>
                  <SelectItem value="deleted">Deleted</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="search">Search</Label>
              <Input
                id="search"
                placeholder="Search logs..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
              />
            </div>
          </div>
        </form>
      </Card>

      {/* Audit Logs */}
      {logs.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">No audit logs found</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => (
            <Card key={log.id} className="p-4 hover:bg-muted/50 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={getActionBadgeVariant(log.action)}>
                      {log.action}
                    </Badge>
                    <span className="font-medium">
                      {log.entityType.charAt(0).toUpperCase() + log.entityType.slice(1)}
                    </span>
                    {log.entityName && (
                      <>
                        <span className="text-muted-foreground">•</span>
                        <span className="font-semibold">{log.entityName}</span>
                      </>
                    )}
                  </div>

                  {renderChangeDetails(log)}
                </div>

                <div className="text-right text-sm text-muted-foreground">
                  <p>
                    {formatDistanceToNow(new Date(log.changedAt), {
                      addSuffix: true,
                    })}
                  </p>
                  {log.changedByName && (
                    <p className="text-xs">by {log.changedByName}</p>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
          </p>
          <div className="flex gap-2">
            <button
              onClick={() =>
                setPagination((prev) => ({ ...prev, page: prev.page - 1 }))
              }
              disabled={pagination.page === 1}
              className="px-4 py-2 text-sm rounded-md border hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() =>
                setPagination((prev) => ({ ...prev, page: prev.page + 1 }))
              }
              disabled={pagination.page === pagination.totalPages}
              className="px-4 py-2 text-sm rounded-md border hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
