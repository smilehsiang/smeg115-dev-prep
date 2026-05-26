#!/usr/bin/env node
/**
 * smeg115 Exam Prep Content Generator
 * Calls Claude API to generate study material + practice exercises for each section.
 *
 * Usage:
 *   ANTHROPIC_API_KEY=sk-... node generate-content.js              # generate all
 *   ANTHROPIC_API_KEY=sk-... node generate-content.js --chapter=ch01
 *   ANTHROPIC_API_KEY=sk-... node generate-content.js --reset       # clear cache and restart
 */

import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'docs', 'data');
const PROGRESS_FILE = path.join(__dirname, '.progress.json');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── Chapter & Section Definitions ───────────────────────────────────────────

const CHAPTERS = [
  {
    id: 'ch01',
    title: 'C# 程式設計',
    priority: '第一優先',
    examWeight: '非選擇題 80%，全程手寫 C#，不可查文件',
    color: '#e74c3c',
    sections: [
      {
        id: 'oop-pillars',
        title: 'OOP 四大柱：封裝、繼承、多型、抽象',
        targetCount: 15,
        types: { coding: 7, debugging: 5, 'multiple-choice': 3 },
        hint: '重點：abstract class、virtual/override、sealed、protected、base關鍵字的正確用法；多型的runtime binding；手寫完整的繼承體系'
      },
      {
        id: 'interface-abstract',
        title: '介面 vs 抽象類別',
        targetCount: 12,
        types: { coding: 5, debugging: 4, 'multiple-choice': 3 },
        hint: '重點：interface 可多重實作、abstract class 有建構子、default interface method (C# 8+)；何時用介面何時用抽象類別；IComparable、IEnumerable 等常見介面'
      },
      {
        id: 'generics',
        title: '泛型 (Generics)',
        targetCount: 10,
        types: { coding: 5, debugging: 3, 'multiple-choice': 2 },
        hint: '重點：class Stack<T>、where T : class/struct/new()/IComparable、共變性/逆變性(out/in)、泛型方法；考試常考自訂泛型類別與泛型Stack/Queue'
      },
      {
        id: 'delegate-event',
        title: '委派與事件 (Delegate / Event)',
        targetCount: 12,
        types: { coding: 6, debugging: 4, 'multiple-choice': 2 },
        hint: '重點：delegate 宣告與多播委派、Action<T>/Func<T,TResult>/Predicate<T>、event 關鍵字防止外部觸發、lambda expression、匿名方法；EventHandler 標準模式'
      },
      {
        id: 'linq',
        title: 'LINQ 查詢語法',
        targetCount: 18,
        types: { coding: 10, debugging: 5, 'multiple-choice': 3 },
        hint: '重點：Where/Select/SelectMany/GroupBy/OrderBy/ThenBy/Join/GroupJoin/FirstOrDefault/SingleOrDefault/Any/All/Count/Sum/Aggregate；查詢語法 vs 方法語法；延遲執行；IEnumerable vs IQueryable'
      },
      {
        id: 'async-await',
        title: '非同步程式設計 (async/await)',
        targetCount: 12,
        types: { coding: 6, debugging: 4, 'multiple-choice': 2 },
        hint: '重點：async/await 基本語法、Task vs Task<T>、ConfigureAwait(false)、CancellationToken 取消操作、Task.WhenAll/WhenAny、避免 deadlock、async void 的危險性'
      },
      {
        id: 'exception-handling',
        title: '例外處理 (Exception Handling)',
        targetCount: 10,
        types: { coding: 5, debugging: 3, 'multiple-choice': 2 },
        hint: '重點：try/catch/finally 執行順序、自訂 Exception 類別（繼承 Exception）、when 過濾子句、throw vs throw ex 的差異（堆疊追蹤）、using/IDisposable'
      },
      {
        id: 'debugging',
        title: '除錯題專區（模擬考試題型）',
        targetCount: 21,
        types: { coding: 0, debugging: 21, 'multiple-choice': 0 },
        hint: '模擬考試除錯題型。每題提供有 bug 的 C# 程式碼（10-30行），錯誤種類涵蓋：邏輯錯誤、NullReferenceException、IndexOutOfRange、型別錯誤、非同步陷阱、LINQ 誤用、OOP 設計錯誤、事件重複訂閱等。每題至少 1 個 bug，部分題目有 2-3 個 bug。'
      }
    ]
  },
  {
    id: 'ch02',
    title: 'MS SQL Server',
    priority: '第二優先',
    examWeight: '手寫 SQL，含複雜查詢設計題',
    color: '#3498db',
    sections: [
      {
        id: 'cte',
        title: '通用資料表運算式 (CTE)',
        targetCount: 10,
        types: { coding: 6, debugging: 2, 'multiple-choice': 2 },
        hint: '重點：WITH cte AS (...)、遞迴 CTE（樹狀結構查詢）、多個 CTE 串接、CTE vs 子查詢的可讀性比較；典型考題：員工階層查詢、累積計算'
      },
      {
        id: 'window-functions',
        title: '視窗函數 (Window Functions)',
        targetCount: 10,
        types: { coding: 6, debugging: 2, 'multiple-choice': 2 },
        hint: '重點：ROW_NUMBER/RANK/DENSE_RANK 的差異、PARTITION BY、ORDER BY within OVER()、LAG/LEAD、FIRST_VALUE/LAST_VALUE、SUM OVER (ROWS BETWEEN)；考試常考各部門第N高薪員工'
      },
      {
        id: 'joins',
        title: 'JOIN 全類型',
        targetCount: 10,
        types: { coding: 6, debugging: 2, 'multiple-choice': 2 },
        hint: '重點：INNER/LEFT/RIGHT/FULL OUTER JOIN 的結果差異、CROSS JOIN、SELF JOIN；各種 JOIN 的 Venn Diagram 概念；多表 JOIN；NULL 值在 JOIN 中的行為'
      },
      {
        id: 'subquery',
        title: '子查詢與 EXISTS',
        targetCount: 10,
        types: { coding: 6, debugging: 2, 'multiple-choice': 2 },
        hint: '重點：correlated subquery vs 非相關子查詢、IN vs EXISTS 效能差異、NOT IN vs NOT EXISTS（NULL 的陷阱）、scalar subquery、derived table；何時用 JOIN 何時用子查詢'
      },
      {
        id: 'db-objects',
        title: 'Stored Procedure / View / Trigger / Function',
        targetCount: 10,
        types: { coding: 6, debugging: 2, 'multiple-choice': 2 },
        hint: '重點：CREATE PROCEDURE with INPUT/OUTPUT 參數、CREATE VIEW (with SCHEMABINDING)、AFTER/INSTEAD OF Trigger、Scalar vs Table-Valued Function；各物件的適用場景與限制'
      },
      {
        id: 'transaction',
        title: '交易與 ACID',
        targetCount: 10,
        types: { coding: 5, debugging: 2, 'multiple-choice': 3 },
        hint: '重點：BEGIN TRAN/COMMIT/ROLLBACK、SAVE TRANSACTION 儲存點、ACID 四性質的解釋、隔離層級（READ UNCOMMITTED到SERIALIZABLE）、Dirty Read/Non-Repeatable Read/Phantom Read；@@TRANCOUNT'
      },
      {
        id: 'index',
        title: '索引設計 (Index)',
        targetCount: 10,
        types: { coding: 4, debugging: 2, 'multiple-choice': 4 },
        hint: '重點：Clustered vs Non-Clustered 差異（每表只能有1個Clustered）、Covering Index（INCLUDE）、Composite Index 欄位順序、何時建索引何時不建、索引對 DML 的影響；Execution Plan 基本概念'
      },
      {
        id: 'normalization',
        title: '資料庫正規化',
        targetCount: 10,
        types: { coding: 3, debugging: 2, 'multiple-choice': 5 },
        hint: '重點：1NF（原子值）→ 2NF（消除部分相依）→ 3NF（消除遞移相依）的判斷與拆表步驟；BCNF；反正規化的時機；functional dependency（函數相依）的概念；考試常考給一個非正規化表格，要求拆到3NF'
      }
    ]
  },
  {
    id: 'ch03',
    title: 'ASP.NET Web Forms',
    priority: '第三優先',
    examWeight: '生命週期順序、PostBack、ViewState、Session 差異',
    color: '#9b59b6',
    sections: [
      {
        id: 'page-lifecycle',
        title: 'Page 生命週期',
        targetCount: 7,
        types: { coding: 3, debugging: 2, 'multiple-choice': 2 },
        hint: '重點：PreInit→Init→InitComplete→PreLoad→Load→Control Events→LoadComplete→PreRender→PreRenderComplete→SaveStateComplete→Render→Unload 的正確順序；每個階段能做什麼；IsPostBack 在哪個階段可靠'
      },
      {
        id: 'postback',
        title: 'PostBack 機制',
        targetCount: 7,
        types: { coding: 3, debugging: 2, 'multiple-choice': 2 },
        hint: '重點：__VIEWSTATE、__EVENTTARGET、__EVENTARGUMENT 隱藏欄位；AutoPostBack 屬性；UpdatePanel 局部更新；IPostBackEventHandler 介面；如何防止不必要的 PostBack'
      },
      {
        id: 'viewstate',
        title: 'ViewState',
        targetCount: 7,
        types: { coding: 3, debugging: 2, 'multiple-choice': 2 },
        hint: '重點：ViewState 儲存在 HTML 的隱藏欄位（base64 encoded）、EnableViewState="false" 停用、ViewState["key"] 存取、適合存什麼不適合存什麼、ViewState vs Session vs Cache'
      },
      {
        id: 'session-state',
        title: 'Session / Application / Cookie',
        targetCount: 7,
        types: { coding: 3, debugging: 2, 'multiple-choice': 2 },
        hint: '重點：Session（per user, server-side）vs Application（所有使用者共享）vs Cookie（client-side）vs Cache；Session 逾時設定；InProc vs StateServer vs SQLServer Session 模式；Cookie Secure/HttpOnly 屬性'
      },
      {
        id: 'code-behind',
        title: 'Code-Behind 架構',
        targetCount: 6,
        types: { coding: 3, debugging: 2, 'multiple-choice': 1 },
        hint: '重點：.aspx 宣告式標記 + .aspx.cs 程式碼分離；partial class 原理；CodeBehind vs CodeFile 屬性；Master Page 與 Content Page 的關係；控制項宣告自動產生的 designer.cs'
      },
      {
        id: 'controls-config',
        title: 'Server Controls 與 Web.config',
        targetCount: 6,
        types: { coding: 3, debugging: 1, 'multiple-choice': 2 },
        hint: '重點：Server Controls（runat="server"）vs HTML Controls、GridView/Repeater/DataList 資料繫結、Web.config 的 connectionStrings 與 appSettings 讀取方式（ConfigurationManager）；compilation debug="true"'
      }
    ]
  },
  {
    id: 'ch04',
    title: '資料結構與演算法',
    priority: '第四優先',
    examWeight: '手寫 C# 實作 + 時間複雜度分析',
    color: '#27ae60',
    sections: [
      {
        id: 'linked-list',
        title: 'Linked List',
        targetCount: 6,
        types: { coding: 4, debugging: 1, 'multiple-choice': 1 },
        hint: '重點：Node 類別設計、單向/雙向 Linked List、插入（頭/尾/中間）、刪除、搜尋；反轉 Linked List（考試常考）；手寫 C# 實作（不使用 LinkedList<T>）'
      },
      {
        id: 'stack-queue',
        title: 'Stack 與 Queue',
        targetCount: 6,
        types: { coding: 4, debugging: 1, 'multiple-choice': 1 },
        hint: '重點：用陣列或 List<T> 實作 Stack（Push/Pop/Peek）和 Queue（Enqueue/Dequeue）；LIFO vs FIFO；Stack 應用（括號配對、運算式求值）；Queue 應用（BFS）；Circular Queue'
      },
      {
        id: 'bst',
        title: 'Binary Search Tree (BST)',
        targetCount: 6,
        types: { coding: 4, debugging: 1, 'multiple-choice': 1 },
        hint: '重點：BSTNode 類別設計、Insert/Search 操作、Inorder（由小到大）/Preorder/Postorder 遍歷的手寫遞迴實作；BST 的搜尋效率 O(log n) vs O(n)；考試常考手寫遍歷'
      },
      {
        id: 'sorting',
        title: '排序演算法',
        targetCount: 6,
        types: { coding: 3, debugging: 1, 'multiple-choice': 2 },
        hint: '重點：Bubble Sort/Selection Sort/Insertion Sort 的 C# 實作；Quick Sort 的 partition 邏輯；Merge Sort 的 divide-and-conquer；各演算法的最佳/平均/最差複雜度；穩定性（Stable Sort）'
      },
      {
        id: 'complexity',
        title: '時間複雜度分析',
        targetCount: 6,
        types: { coding: 2, debugging: 0, 'multiple-choice': 4 },
        hint: '重點：O(1)/O(log n)/O(n)/O(n log n)/O(n²)/O(2ⁿ) 的識別；如何分析巢狀迴圈；Big O vs Omega vs Theta；常見資料結構操作的複雜度；空間複雜度（Space Complexity）'
      }
    ]
  },
  {
    id: 'ch05',
    title: '系統分析與 UML',
    priority: '第五優先',
    examWeight: '設計說明題 + 手畫圖表',
    color: '#f39c12',
    sections: [
      {
        id: 'use-case',
        title: 'Use Case Diagram',
        targetCount: 4,
        types: { coding: 0, debugging: 0, 'multiple-choice': 2, design: 2 },
        hint: '重點：Actor、Use Case、include（必定執行）vs extend（條件執行）、系統邊界；考試常考根據需求描述畫出 Use Case Diagram；銀行/圖書館/電商系統場景'
      },
      {
        id: 'class-diagram',
        title: 'Class Diagram',
        targetCount: 4,
        types: { coding: 0, debugging: 0, 'multiple-choice': 2, design: 2 },
        hint: '重點：繼承（實線空心三角箭頭）、介面實作（虛線空心三角箭頭）、關聯（實線）、聚合（空心菱形）、組合（實心菱形）、相依（虛線箭頭）；多重性（0..1、1..*）；屬性/方法的可視性（+/-/#）'
      },
      {
        id: 'sequence-diagram',
        title: 'Sequence Diagram',
        targetCount: 3,
        types: { coding: 0, debugging: 0, 'multiple-choice': 1, design: 2 },
        hint: '重點：生命線（Lifeline）、訊息（Message）、自我訊息、同步 vs 非同步訊息；activation box（啟動條）；alt/opt/loop 片段；考試常考登入流程、訂單流程的 Sequence Diagram'
      },
      {
        id: 'design-patterns',
        title: '設計模式 (Design Patterns)',
        targetCount: 4,
        types: { coding: 2, debugging: 0, 'multiple-choice': 2 },
        hint: '重點：Singleton（確保單一實例，Thread-safe 版本）、Factory（封裝物件建立）、Repository（抽象資料存取層）、MVC（關注點分離）；各模式的 C# 實作範例；考試常考 Singleton 手寫'
      }
    ]
  },
  {
    id: 'ch06',
    title: 'HTML / JS / CSS',
    priority: '第六優先',
    examWeight: '口試可能問，快速複習即可',
    color: '#1abc9c',
    sections: [
      {
        id: 'html5',
        title: 'HTML5 語意標籤',
        targetCount: 3,
        types: { coding: 1, debugging: 0, 'multiple-choice': 2 },
        hint: '重點：<header>/<nav>/<main>/<section>/<article>/<aside>/<footer> 的正確語意與使用場景；<figure>/<figcaption>；HTML5 新增的 input type (email/date/range)；data-* 屬性'
      },
      {
        id: 'css',
        title: 'CSS Box Model 與 Flexbox',
        targetCount: 4,
        types: { coding: 2, debugging: 0, 'multiple-choice': 2 },
        hint: '重點：Box Model（content/padding/border/margin）、box-sizing: border-box；Flexbox：flex-direction/justify-content/align-items/flex-wrap；Position：static/relative/absolute/fixed；CSS 選擇器優先權'
      },
      {
        id: 'javascript',
        title: 'JavaScript DOM 操作與 AJAX',
        targetCount: 3,
        types: { coding: 2, debugging: 0, 'multiple-choice': 1 },
        hint: '重點：document.getElementById/querySelector、addEventListener、innerHTML vs textContent；fetch() API 基本寫法；async/await with fetch；JSON.parse/stringify；closure 與 hoisting 概念'
      }
    ]
  }
];

// ─── Prompt Builder ───────────────────────────────────────────────────────────

function buildPrompt(chapter, section) {
  const typeBreakdown = Object.entries(section.types)
    .filter(([, count]) => count > 0)
    .map(([type, count]) => `  - ${type}: ${count} 題`)
    .join('\n');

  const typeGuide = `
### 題型說明：
- **coding**：給考生一個明確的程式設計任務，要求手寫完整且正確的 C# 程式碼（模擬考試手寫題）
- **debugging**：提供 10-30 行有 bug 的 C# 程式碼，要求找出所有錯誤並修正，錯誤數量 1-3 個
- **multiple-choice**：4 個選項的選擇題，只有一個正確答案
- **design**：系統設計或圖表說明題（僅 UML 章節使用）`;

  return `你是一位資深 C# 與軟體工程專家，正在為「財團法人中小企業信用保證基金 115年儲備職員甄選資訊人員」考試製作考前複習教材。

### 考試重要資訊：
- 考試時間：90 分鐘
- 題型：選擇題 20% + 非選擇題 80%（非選擇題全程**手寫 C# 程式碼**，不可查任何文件）
- 除錯題是重要考題類型：給定有 bug 的程式碼要求修正
- 本次要製作的章節：**${chapter.title}**（${chapter.priority}）

### 當前小節：
**${section.title}**

### 考試重點提示：
${section.hint}

### 需要產出：
- 完整教學說明
- 練習題共 **${section.targetCount} 題**，題型分配：
${typeBreakdown}
${typeGuide}

### 輸出格式（必須是合法 JSON，不要有任何其他文字）：

\`\`\`json
{
  "id": "${section.id}",
  "title": "${section.title}",
  "content": "完整的繁體中文教學說明，至少 700 字。包含：(1)概念定義與核心原理，(2)使用時機與常見場景，(3)與相關概念的比較，(4)考試常犯的錯誤與陷阱",
  "codeExample": "// 完整的 C# 示範程式碼，至少 30 行，每個重要部分都要有繁體中文行內注解說明",
  "keyPoints": [
    "考試重點 1（精簡、直接、可背誦的形式）",
    "考試重點 2",
    "考試重點 3",
    "考試重點 4",
    "考試重點 5"
  ],
  "exercises": [
    {
      "id": 1,
      "type": "coding",
      "question": "題目描述（清楚說明要實作什麼功能，模擬考試題型語氣）",
      "answer": "// 完整正確的 C# 程式碼解答，包含所有必要的類別定義和方法",
      "explanation": "解題說明：為什麼這樣寫、考試時的注意事項、容易失分的地方"
    },
    {
      "id": 2,
      "type": "debugging",
      "question": "以下 C# 程式碼共有 X 處錯誤，請找出並修正：",
      "buggyCode": "// 包含 bug 的程式碼（10-30行）",
      "answer": "// 修正後的完整程式碼，在修正處加上注解：// [修正] 原本是 XXX，錯誤原因是 YYY",
      "explanation": "說明每個 bug 的原因、正確做法、以及這類錯誤在實際開發中的影響"
    },
    {
      "id": 3,
      "type": "multiple-choice",
      "question": "題目（考察概念理解或實際應用）",
      "options": ["A. 選項A", "B. 選項B", "C. 選項C", "D. 選項D"],
      "answer": "B",
      "explanation": "為什麼 B 正確：說明原因。為什麼 A/C/D 不正確：分別說明各選項的問題"
    }
  ]
}
\`\`\`

請確保：
1. 所有 C# 程式碼語法正確，可以直接在 Visual Studio 編譯
2. 練習題難度模擬真實考試（中等至偏難）
3. debugging 題的 bug 要真實、有意義，不是故意打錯字
4. 繁體中文說明清楚易懂
5. 只輸出 JSON，不要有 \`\`\`json 包裝，不要有任何前置說明文字`;
}

// ─── JSON Parser ──────────────────────────────────────────────────────────────

function extractJSON(text) {
  // Remove markdown code blocks if present
  let cleaned = text.replace(/^```json\s*/m, '').replace(/^```\s*/m, '').replace(/```\s*$/m, '').trim();

  // Try direct parse first
  try {
    return JSON.parse(cleaned);
  } catch {}

  // Try to find JSON object in the text
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start !== -1 && end !== -1) {
    try {
      return JSON.parse(cleaned.slice(start, end + 1));
    } catch (e) {
      throw new Error(`JSON parse failed: ${e.message}\nText preview: ${cleaned.slice(start, start + 200)}`);
    }
  }

  throw new Error('No JSON object found in response');
}

// ─── API Call ─────────────────────────────────────────────────────────────────

async function generateSection(chapter, section, retries = 3) {
  const prompt = buildPrompt(chapter, section);

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      process.stdout.write(`    → Calling Claude API... `);
      const response = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 8192,
        messages: [{ role: 'user', content: prompt }]
      });

      const text = response.content[0].text;
      const data = extractJSON(text);

      // Validate structure
      if (!data.id || !data.title || !data.content || !Array.isArray(data.exercises)) {
        throw new Error('Invalid section structure: missing required fields');
      }

      console.log(`✓ (${data.exercises.length} exercises)`);
      return data;
    } catch (err) {
      console.log(`✗ (attempt ${attempt}/${retries}): ${err.message}`);
      if (attempt < retries) {
        const delay = attempt * 3000;
        console.log(`    → Retrying in ${delay / 1000}s...`);
        await new Promise(r => setTimeout(r, delay));
      } else {
        throw err;
      }
    }
  }
}

// ─── Progress Tracking ────────────────────────────────────────────────────────

function loadProgress() {
  if (fs.existsSync(PROGRESS_FILE)) {
    return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
  }
  return {};
}

function saveProgress(progress) {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('Error: ANTHROPIC_API_KEY environment variable is not set.');
    console.error('Usage: ANTHROPIC_API_KEY=sk-ant-... node generate-content.js');
    process.exit(1);
  }

  const args = process.argv.slice(2);
  const resetFlag = args.includes('--reset');
  const chapterArg = args.find(a => a.startsWith('--chapter='));
  const targetChapter = chapterArg ? chapterArg.split('=')[1] : null;
  const sectionArg = args.find(a => a.startsWith('--section='));
  const targetSection = sectionArg ? sectionArg.split('=')[1] : null;

  if (resetFlag) {
    if (fs.existsSync(PROGRESS_FILE)) {
      fs.unlinkSync(PROGRESS_FILE);
      console.log('✓ Progress cache cleared.');
    }
    if (!targetChapter) {
      console.log('Run without --reset to start generation.');
      return;
    }
  }

  fs.mkdirSync(DATA_DIR, { recursive: true });

  const progress = loadProgress();
  const chaptersToProcess = targetChapter
    ? CHAPTERS.filter(c => c.id === targetChapter)
    : CHAPTERS;

  if (chaptersToProcess.length === 0) {
    console.error(`Chapter not found: ${targetChapter}`);
    console.error('Available:', CHAPTERS.map(c => c.id).join(', '));
    process.exit(1);
  }

  let totalGenerated = 0;
  let totalSkipped = 0;
  let totalFailed = 0;

  for (const chapter of chaptersToProcess) {
    console.log(`\n${'═'.repeat(60)}`);
    console.log(`  ${chapter.id.toUpperCase()} │ ${chapter.title} (${chapter.priority})`);
    console.log(`${'═'.repeat(60)}`);

    const chapterData = {
      chapter: parseInt(chapter.id.replace('ch', '')),
      id: chapter.id,
      title: chapter.title,
      priority: chapter.priority,
      examWeight: chapter.examWeight,
      color: chapter.color,
      sections: []
    };

    // Load existing chapter file if it exists (to preserve sections)
    const outputPath = path.join(DATA_DIR, `${chapter.id}.json`);
    if (fs.existsSync(outputPath)) {
      const existing = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
      chapterData.sections = existing.sections || [];
    }

    const sectionsToProcess = targetSection
      ? chapter.sections.filter(s => s.id === targetSection)
      : chapter.sections;

    for (const section of sectionsToProcess) {
      const progressKey = `${chapter.id}:${section.id}`;
      process.stdout.write(`  [${section.id}] ${section.title}\n`);

      if (progress[progressKey] && !resetFlag) {
        console.log(`    → Cached (${progress[progressKey].exercises?.length || 0} exercises), skipping.`);
        // Ensure section is in chapterData
        const existingIdx = chapterData.sections.findIndex(s => s.id === section.id);
        if (existingIdx === -1) {
          chapterData.sections.push(progress[progressKey]);
        }
        totalSkipped++;
        continue;
      }

      try {
        const sectionData = await generateSection(chapter, section);
        progress[progressKey] = sectionData;
        saveProgress(progress);

        // Update section in chapterData
        const idx = chapterData.sections.findIndex(s => s.id === section.id);
        if (idx !== -1) {
          chapterData.sections[idx] = sectionData;
        } else {
          chapterData.sections.push(sectionData);
        }

        // Save chapter file after each section (fail-safe)
        fs.writeFileSync(outputPath, JSON.stringify(chapterData, null, 2));
        totalGenerated++;

        // Rate limiting: 1.5s between calls
        await new Promise(r => setTimeout(r, 1500));
      } catch (err) {
        console.error(`    ✗ FAILED: ${err.message}`);
        totalFailed++;
      }
    }

    // Final save
    fs.writeFileSync(outputPath, JSON.stringify(chapterData, null, 2));
    console.log(`\n  ✓ Saved → ${outputPath}`);
  }

  const totalExercises = Object.values(progress)
    .reduce((sum, s) => sum + (s.exercises?.length || 0), 0);

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  Generation Complete`);
  console.log(`  Generated: ${totalGenerated} sections | Skipped: ${totalSkipped} | Failed: ${totalFailed}`);
  console.log(`  Total exercises in cache: ${totalExercises}`);
  console.log(`${'═'.repeat(60)}\n`);

  if (totalFailed > 0) {
    console.log('Some sections failed. Run the command again to retry failed sections.');
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
