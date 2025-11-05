"use client";

import {useCallback, useEffect, useMemo, useRef} from "react";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { LinkPlugin } from "@lexical/react/LexicalLinkPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { $generateHtmlFromNodes, $generateNodesFromDOM } from "@lexical/html";
import { $getRoot, $getSelection, EditorState, LexicalEditor as LexicalCoreEditor } from "lexical";
import { HeadingNode, QuoteNode, $createHeadingNode, HeadingTagType } from "@lexical/rich-text";
import { ListItemNode, ListNode, INSERT_ORDERED_LIST_COMMAND, INSERT_UNORDERED_LIST_COMMAND } from "@lexical/list";
import { LinkNode, AutoLinkNode } from "@lexical/link";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { FORMAT_TEXT_COMMAND } from "lexical";
import { Button } from "@/components/ui/button";
import { Bold, Italic, Underline, List as ListIcon, ListOrdered } from "lucide-react";

type KtdLexicalEditorProps = {
  initialHTML?: string;
  initialJSON?: any;
  onChangeHTML?: (html: string) => void;
  onChangeJSON?: (json: any) => void;
  className?: string;
  minHeight?: string;
};

function LoadInitialContentPlugin({ html }: { html?: string }) {
  const [editor] = useLexicalComposerContext();
  const hasLoaded = useRef(false);

  useEffect(() => {
    if (!html || !editor || hasLoaded.current) return;
    
    editor.update(() => {
      try {
        const parser = new DOMParser();
        // Ensure HTML is properly wrapped
        const wrappedHtml = html.trim().startsWith('<') ? html : `<p>${html}</p>`;
        const dom = parser.parseFromString(wrappedHtml, "text/html");
        
        const root = $getRoot();
        root.clear();
        
        // Get body element and its innerHTML
        const body = dom.body;
        const bodyContent = body.innerHTML;
        
        // Create a temporary container div with body's content
        // This ensures we only get element nodes
        const tempContainer = document.createElement('div');
        tempContainer.innerHTML = bodyContent;
        
        // Generate nodes from the container
        const nodes = $generateNodesFromDOM(editor, tempContainer);
        
        // Filter to only element/decorator nodes (not text nodes directly)
        // Root node can only contain element or decorator nodes, not text nodes
        const validNodes = nodes.filter((node: any) => {
          const nodeType = (node as any).__type;
          // Exclude text nodes - only allow element nodes like paragraph, heading, list, etc.
          return nodeType && nodeType !== 'text';
        });
        
        // Only append if we have valid element nodes
        if (validNodes.length > 0) {
          root.append(...validNodes);
        }
        
        hasLoaded.current = true;
      } catch (error) {
        console.error("Error loading initial content:", error);
        hasLoaded.current = true;
      }
    });
  }, [html, editor]);

  return null;
}

export default function KtdLexicalEditor({ initialHTML, initialJSON, onChangeHTML, onChangeJSON, className, minHeight = "400px" }: KtdLexicalEditorProps) {
  const editorState = useMemo(() => {
    if (initialJSON) {
      return JSON.stringify(initialJSON);
    }
    return undefined;
  }, [initialJSON]);

  const initialConfig = useMemo(() => ({
    namespace: "course-article-editor",
    editorState,
    onError(error: Error) { console.error(error); },
    nodes: [HeadingNode, QuoteNode, ListNode, ListItemNode, LinkNode, AutoLinkNode],
    theme: {
      paragraph: "mb-2",
      heading: {
        h1: "text-3xl font-bold mb-4",
        h2: "text-2xl font-bold mb-3",
      },
      list: {
        ul: "list-disc pl-6 mb-2",
        ol: "list-decimal pl-6 mb-2",
        listitem: "mb-1",
      },
      text: {
        bold: "font-bold",
        italic: "italic",
        underline: "underline",
        strikethrough: "line-through",
        underlineStrikethrough: "underline line-through",
      },
    },
  }), [editorState]);

  const handleChange = useCallback((state: EditorState, editor: LexicalCoreEditor) => {
    if (onChangeJSON) {
      const json = state.toJSON();
      onChangeJSON(json);
    }
    if (onChangeHTML) {
      editor.update(() => {
        const html = $generateHtmlFromNodes(editor, null);
        onChangeHTML(html);
      });
    }
  }, [onChangeHTML, onChangeJSON]);

  return (
    <div className={`lexical-editor ${className}`}>
      <LexicalComposer initialConfig={initialConfig}>
        <ToolbarPlugin />
        <div className="relative">
          <LoadInitialContentPlugin html={initialHTML && !initialJSON ? initialHTML : undefined} />
          <RichTextPlugin
            contentEditable={
              <ContentEditable 
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 prose prose-sm max-w-none dark:prose-invert [&_span[style*='text-decoration']]:underline [&_.underline]:underline" 
                style={{ minHeight }}
              />
            }
            placeholder={<div className="text-sm text-muted-foreground px-3 py-2 absolute top-2 left-2 pointer-events-none">Tulis konten…</div>}
            ErrorBoundary={LexicalErrorBoundary}
          />
        </div>
        <HistoryPlugin />
        <ListPlugin />
        <LinkPlugin />
        <OnChangePlugin onChange={handleChange} />
      </LexicalComposer>
    </div>
  );
}

function ToolbarPlugin() {
  const [editor] = useLexicalComposerContext();

  const handleFormat = useCallback((format: "bold" | "italic" | "underline") => {
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, format);
  }, [editor]);

  const handleHeading = useCallback((tag: HeadingTagType) => {
    editor.update(() => {
      const selection = $getSelection();
      if (selection) {
        const nodes = selection.getNodes();
        if (nodes.length > 0) {
          const firstNode = nodes[0];
          const headingNode = $createHeadingNode(tag);
          firstNode.replace(headingNode);
          headingNode.select();
        } else {
          const root = $getRoot();
          const headingNode = $createHeadingNode(tag);
          root.append(headingNode);
          headingNode.select();
        }
      } else {
        const root = $getRoot();
        const headingNode = $createHeadingNode(tag);
        root.append(headingNode);
        headingNode.select();
      }
    });
  }, [editor]);

  const handleList = useCallback((type: "ordered" | "unordered") => {
    if (type === "ordered") {
      editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
    } else {
      editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
    }
  }, [editor]);

  return (
    <div className="flex items-center gap-0.5 md:gap-2 p-1 md:p-2 border rounded-md bg-muted/50 mb-2 overflow-x-auto">
      <Button 
        type="button" 
        variant="ghost" 
        size="sm" 
        className="h-6 w-6 md:h-8 md:w-8 p-0 shrink-0" 
        onMouseDown={(e) => { e.preventDefault(); handleFormat("bold"); }}
      >
        <Bold className="h-3 w-3 md:h-4 md:w-4" />
      </Button>
      <Button 
        type="button" 
        variant="ghost" 
        size="sm" 
        className="h-6 w-6 md:h-8 md:w-8 p-0 shrink-0" 
        onMouseDown={(e) => { e.preventDefault(); handleFormat("italic"); }}
      >
        <Italic className="h-3 w-3 md:h-4 md:w-4" />
      </Button>
      <Button 
        type="button" 
        variant="ghost" 
        size="sm" 
        className="h-6 w-6 md:h-8 md:w-8 p-0 shrink-0" 
        onMouseDown={(e) => { e.preventDefault(); handleFormat("underline"); }}
      >
        <Underline className="h-3 w-3 md:h-4 md:w-4" />
      </Button>
      <div className="w-px h-4 md:h-6 bg-border shrink-0" />
      <Button 
        type="button" 
        variant="ghost" 
        size="sm" 
        className="h-6 px-1 md:h-8 md:px-2 shrink-0 text-[10px] md:text-sm" 
        onMouseDown={(e) => { e.preventDefault(); handleHeading("h1"); }}
      >
        H1
      </Button>
      <Button 
        type="button" 
        variant="ghost" 
        size="sm" 
        className="h-6 px-1 md:h-8 md:px-2 shrink-0 text-[10px] md:text-sm" 
        onMouseDown={(e) => { e.preventDefault(); handleHeading("h2"); }}
      >
        H2
      </Button>
      <Button 
        type="button" 
        variant="ghost" 
        size="sm" 
        className="h-6 w-6 md:h-8 md:w-8 p-0 shrink-0" 
        onMouseDown={(e) => { e.preventDefault(); handleList("unordered"); }}
      >
        <ListIcon className="h-3 w-3 md:h-4 md:w-4" />
      </Button>
      <Button 
        type="button" 
        variant="ghost" 
        size="sm" 
        className="h-6 w-6 md:h-8 md:w-8 p-0 shrink-0" 
        onMouseDown={(e) => { e.preventDefault(); handleList("ordered"); }}
      >
        <ListOrdered className="h-3 w-3 md:h-4 md:w-4" />
      </Button>
    </div>
  );
}

