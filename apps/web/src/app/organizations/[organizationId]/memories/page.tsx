'use client';

import { use, useState, type FormEvent } from 'react';
import { Brain } from 'lucide-react';
import { toast } from 'sonner';
import {
  MEMORY_PROVIDERS,
  type MemoryProvider,
  type SearchMemoriesResponse,
} from '@app-starter/shared';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { memoriesApi } from '@/lib/memories-api';

interface PageProps {
  params: Promise<{ organizationId: string }>;
}

const PROVIDER_LABELS: Record<MemoryProvider, string> = {
  hydradb: 'HydraDB',
  cognee: 'Cognee',
};

const MemoriesPage = ({ params }: PageProps) => {
  const { organizationId } = use(params);
  const [provider, setProvider] = useState<MemoryProvider>('hydradb');
  const [text, setText] = useState('');
  const [query, setQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<SearchMemoriesResponse | null>(null);

  const handleAdd = async (event: FormEvent) => {
    event.preventDefault();
    if (!text.trim()) return;

    setIsSaving(true);
    try {
      const response = await memoriesApi.add(organizationId, { text, provider });
      if (response.status === 'failed') {
        toast.error(`${PROVIDER_LABELS[provider]} rejected the memory.`);
        return;
      }
      setText('');
      // Both backends index asynchronously, so say so rather than implying
      // the memory is searchable immediately.
      toast.success(
        `Saved to ${PROVIDER_LABELS[provider]}. It may take a moment to be searchable.`,
      );
    } catch (error) {
      toast.error((error as { message?: string }).message || 'Could not save the memory.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSearch = async (event: FormEvent) => {
    event.preventDefault();
    if (!query.trim()) return;

    setIsSearching(true);
    try {
      setResults(await memoriesApi.search(organizationId, { query, provider }));
    } catch (error) {
      toast.error((error as { message?: string }).message || 'Search failed.');
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <PageContainer>
      <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
        <PageHeader
          title="Memories"
          description="Store and search organization memories through HydraDB or Cognee."
        />

        <div className="space-y-2">
          <Label htmlFor="memory-provider">Provider</Label>
          <Select value={provider} onValueChange={(value) => setProvider(value as MemoryProvider)}>
            <SelectTrigger id="memory-provider" className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MEMORY_PROVIDERS.map((name) => (
                <SelectItem key={name} value={name}>
                  {PROVIDER_LABELS[name]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Add a memory</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAdd} className="space-y-3">
              <Label htmlFor="memory-text" className="sr-only">
                Memory text
              </Label>
              <Textarea
                id="memory-text"
                value={text}
                onChange={(event) => setText(event.target.value)}
                placeholder="Something worth remembering…"
                maxLength={10000}
                rows={4}
              />
              <Button type="submit" disabled={isSaving || !text.trim()}>
                {isSaving ? 'Saving…' : 'Save memory'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Search</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleSearch} className="flex gap-2" role="search">
              <Label htmlFor="memory-query" className="sr-only">
                Search query
              </Label>
              <Input
                id="memory-query"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="What do we know about…"
                maxLength={1000}
              />
              <Button type="submit" disabled={isSearching || !query.trim()}>
                {isSearching ? 'Searching…' : 'Search'}
              </Button>
            </form>

            <SearchResults results={results} />
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
};

const SearchResults = ({ results }: { results: SearchMemoriesResponse | null }) => {
  if (!results) return null;

  if (results.items.length === 0) {
    return (
      <EmptyState
        icon={Brain}
        description={`No memories matched in ${PROVIDER_LABELS[results.provider]}.`}
      />
    );
  }

  return (
    <ul className="space-y-2" aria-label={`Results from ${PROVIDER_LABELS[results.provider]}`}>
      {results.items.map((hit, index) => (
        <li key={hit.id ?? index} className="rounded-md border p-3 text-sm">
          <p className="whitespace-pre-wrap">{hit.content}</p>
          {hit.score !== null && (
            <p className="mt-1 text-xs text-muted-foreground">Score {hit.score.toFixed(3)}</p>
          )}
        </li>
      ))}
    </ul>
  );
};

export default MemoriesPage;
