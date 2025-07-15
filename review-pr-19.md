# PR #19 レビュー対応戦略

## レビューコメント一覧と対応方針

### 1. [HIGH] グローバル設定ファイルのパス表示の不整合

**レビュー内容**: 
`FileItem.tsx`でグローバルな設定ファイル（`~/.claude/settings.json`）が`username/.claude/settings.json`として表示される。`global-md`ファイルは`~`で表示されているため、一貫性がない。

**現在の実装**: 
設定ファイルは3レベルパス表示（`project-name/.claude/settings.json`）を使用しているが、グローバルファイルの判定が実装されていない。

**対応戦略**: ✅ **対応する**
- グローバル設定ファイルかどうかを判定する処理を追加
- ホームディレクトリのパスを含む場合は`~/.claude/settings.json`として表示
- `global-md`と同じ表示ロジックを適用して一貫性を保つ

### 2. [HIGH] ホームディレクトリの再帰的スキャンのパフォーマンス問題

**レビュー内容**: 
`settings-json-scanner.ts`でホームディレクトリを深さ20まで再帰的にスキャンしているが、グローバル設定ファイルは`~/.claude/settings.json`の浅い位置にあるはずなので非効率。

**現在の実装**: 
```typescript
recursive: true, // 深さ20まで
```

**対応戦略**: ✅ **対応する**
- ホームディレクトリスキャン時は`recursive: false`に変更
- グローバル設定ファイルは浅い位置にあることが期待されるため、パフォーマンスが向上

### 3. [MEDIUM] JSON解析エラーの静黙的な処理

**レビュー内容**: 
`Preview.tsx`のJSON解析エラーを`catch {}`で静黙的に処理している。デバッグ時に問題の特定が困難になる可能性がある。

**現在の実装**: 
```typescript
} catch {
  // If parsing fails, return original content
  return content;
}
```

**対応戦略**: ❌ **対応しない**
- **理由**: プレビュー表示でのエラーログは、正常な操作中でも頻繁に発生する可能性があり、コンソールを汚染する
- 現在の実装はユーザー体験を優先し、無効なJSONでも元のコンテンツを表示できる
- `SettingsJsonScanner`で既にJSONバリデーションが行われており、警告も出力される

### 4. [MEDIUM] fdir設定の重複コード

**レビュー内容**: 
`fast-scanner.ts`の`findSettingsJson`で`fdir`クローラーの設定が`findClaudeFiles`や`findSlashCommands`と重複している。

**現在の実装**: 
各関数で同じ除外パターンとクローラー設定を繰り返している。

**対応戦略**: ❌ **対応しない**
- **理由**: 各スキャナーは独立して動作し、異なるフィルタリングロジックを持つ
- 将来的に各スキャナーが異なる設定を必要とする可能性がある
- 現在のコードは明確で理解しやすい
- DRY原則よりも明確性を優先

### 5. [MEDIUM] テストの堅牢性不足

**レビュー内容**: 
`fast-scanner.ts`の`findSettingsJson`テストが配列を返すことのみを確認しており、実際のファイル検出をテストしていない。

**現在の実装**: 
```typescript
expect(Array.isArray(settings)).toBe(true);
// Settings array might be empty if no .claude/project/settings.json exist
```

**対応戦略**: ❌ **対応しない**
- **理由**: `settings-json-scanner.ts`に既に包括的なテストスイートが存在
- `scanSettingsJson`関数が`fs-fixture`を使用した詳細なテストを実装済み
- `findSettingsJson`は内部実装詳細であり、統合テストでカバーされている
- 重複したテストを避けることでメンテナンスコストを削減

## まとめ

5つのレビューコメントのうち、2つの高優先度の問題に対応します：
1. グローバル設定ファイルのパス表示を修正
2. ホームディレクトリスキャンのパフォーマンスを改善

中優先度の3つのコメントについては、現在の実装が適切であり、変更による利益が限定的であるため対応しません。