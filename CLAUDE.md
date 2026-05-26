# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Purpose

Study notes and practice code for the smeg115 exam. Topics: C#/.NET, ASP.NET Web Forms, MS SQL Server, OOP, data structures, and system design.

## Toolchain

- **Language**: C# (.NET Framework or .NET 8+)
- **IDE target**: Visual Studio (`.gitignore` is the standard Visual Studio template)
- **Web**: ASP.NET Web Forms (`.aspx` / code-behind pattern)
- **Database**: MS SQL Server (T-SQL)

## Build & Run

Once `.csproj` / `.sln` files exist:

```bash
# Restore packages and build
dotnet restore
dotnet build

# Run a console or web project
dotnet run --project <ProjectName>

# Run all tests
dotnet test

# Run a single test class or method
dotnet test --filter "FullyQualifiedName~<TestClassName>"
dotnet test --filter "FullyQualifiedName~<TestClassName>.<MethodName>"
```

For Visual Studio Web Forms projects without SDK-style `.csproj`, use `msbuild` instead:

```bash
msbuild <Solution>.sln /p:Configuration=Debug
```

## Repository Structure (expected)

As the repo grows, practice code will likely be organized by topic, e.g.:

- `CSharp/` — language fundamentals, OOP patterns
- `DataStructures/` — algorithms and data structure implementations
- `WebForms/` — ASP.NET Web Forms sample pages and code-behind
- `SQL/` — T-SQL scripts, schema design, stored procedures
- `SystemDesign/` — diagrams or notes on architecture topics
