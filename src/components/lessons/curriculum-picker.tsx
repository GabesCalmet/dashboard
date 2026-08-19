"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { curriculumUnits, classFocusOptions, etapaOptions, isEvaluationUnit } from "@/lib/curriculum";

// Shared "Resumo da aula" content picker — free text or a curriculum unit
// pulled from the material. Picking a specific "Aula" (not a "Teste")
// reveals an Etapa 1/2/3 sub-selection for that lesson; used both from the
// Relatórios "Resumo" editor and the Agenda's lesson report form so both
// flows share the same format.
export function CurriculumPicker({
  mode,
  onModeChange,
  text,
  onTextChange,
  unit,
  onUnitChange,
  focus,
  onFocusChange,
}: {
  mode: "text" | "unit";
  onModeChange: (mode: "text" | "unit") => void;
  text: string;
  onTextChange: (text: string) => void;
  unit: string;
  onUnitChange: (unit: string) => void;
  focus: string;
  onFocusChange: (focus: string) => void;
}) {
  const showFocus = mode === "text" || (mode === "unit" && unit !== "" && !isEvaluationUnit(unit));
  const focusOptions = mode === "unit" ? etapaOptions : classFocusOptions;
  const focusLabel = mode === "unit" ? "Etapa" : "Foco da aula (opcional)";

  return (
    <div className="space-y-4">
      <Tabs value={mode} onValueChange={(v) => onModeChange(v as "text" | "unit")}>
        <TabsList>
          <TabsTrigger value="text">Escrever</TabsTrigger>
          <TabsTrigger value="unit">Selecionar aula do material</TabsTrigger>
        </TabsList>
        <TabsContent value="text" className="mt-3">
          <Textarea
            value={text}
            onChange={(e) => onTextChange(e.target.value)}
            placeholder="Descreva o conteúdo da aula..."
            rows={4}
          />
        </TabsContent>
        <TabsContent value="unit" className="mt-3">
          <Select value={unit} onValueChange={onUnitChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecione a aula ou teste" />
            </SelectTrigger>
            <SelectContent>
              {curriculumUnits.map((u) => (
                <SelectItem key={u} value={u}>
                  {u}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </TabsContent>
      </Tabs>

      {showFocus && (
        <div className="space-y-1.5">
          <Label>{focusLabel}</Label>
          <Select value={focus} onValueChange={onFocusChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={mode === "unit" ? "Selecione a etapa" : "Selecione o foco"} />
            </SelectTrigger>
            <SelectContent>
              {focusOptions.map((f) => (
                <SelectItem key={f} value={f}>
                  {f}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
