"use client";

import { Eye } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { describeResult, formatDateTime, resultScore } from "@/lib/format";
import type { MatchSummary } from "@/lib/types";

/** Per-match results. `perspective` (a user id) adds a Win/Loss/Draw column for that player. */
export function MatchList({
  matches,
  perspective,
  showTournament,
  emptyText = "No games yet",
}: {
  matches: MatchSummary[];
  perspective?: string;
  showTournament?: boolean;
  emptyText?: string;
}) {
  if (matches.length === 0) return <EmptyState title={emptyText} />;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>White</TableHead>
          <TableHead className="text-center">Result</TableHead>
          <TableHead>Black</TableHead>
          {showTournament && <TableHead className="hidden md:table-cell">Tournament</TableHead>}
          <TableHead className="hidden sm:table-cell">Played</TableHead>
          <TableHead className="w-0" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {matches.map((m) => {
          const live = m.status === "ongoing";
          const myColor = perspective ? (m.white.id === perspective ? "white" : "black") : null;
          const outcome = !myColor || !m.result ? null : m.result === "draw" ? "D" : m.result === myColor ? "W" : "L";
          return (
            <TableRow key={m.id}>
              <TableCell className={m.result === "white" ? "font-semibold" : ""}>{m.white.name}</TableCell>
              <TableCell className="text-center" title={describeResult(m.result, m.termination)}>
                {live ? (
                  <Badge className="bg-orange-500 text-white">LIVE</Badge>
                ) : (
                  <span className="font-mono tabular-nums">
                    {resultScore(m.result)}
                    {outcome && (
                      <Badge
                        variant="outline"
                        className={
                          outcome === "W" ? "ml-2 text-emerald-700" : outcome === "L" ? "ml-2 text-destructive" : "ml-2"
                        }
                      >
                        {outcome}
                      </Badge>
                    )}
                  </span>
                )}
              </TableCell>
              <TableCell className={m.result === "black" ? "font-semibold" : ""}>{m.black.name}</TableCell>
              {showTournament && <TableCell className="hidden md:table-cell">{m.tournament?.name}</TableCell>}
              <TableCell className="hidden text-muted-foreground sm:table-cell">{formatDateTime(m.startedAt)}</TableCell>
              <TableCell>
                <Button asChild variant="ghost" size="sm">
                  <Link href={`/matches/${m.id}`}>
                    {live ? (
                      <>
                        <Eye /> Watch
                      </>
                    ) : (
                      "Review"
                    )}
                  </Link>
                </Button>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
