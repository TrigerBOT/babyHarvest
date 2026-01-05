import * as fs from 'fs';

export interface ParsedPregnancyDay {
  day: number;
  week: number;
  trimester: number;
  babySize: string;
  babyWeight: string;
  babyDevelopment: string;
  motherChanges: string;
  tips: string[];
}

/**
 * Парсит markdown файл с данными о беременности и возвращает массив объектов
 */
export class PregnancyDataParser {
  /**
   * Парсит markdown файл и извлекает данные о днях беременности
   */
  static parseMarkdownFile(filePath: string): ParsedPregnancyDay[] {
    const content = fs.readFileSync(filePath, 'utf-8');
    return this.parseMarkdownContent(content);
  }

  /**
   * Парсит содержимое markdown файла
   */
  static parseMarkdownContent(content: string): ParsedPregnancyDay[] {
    const days: ParsedPregnancyDay[] = [];
    
    // Регулярное выражение для поиска блока дня
    // Ищем паттерн: #### День X, затем все поля до следующего #### День или ### Неделя или ---
    const dayPattern = /#### День (\d+)([\s\S]*?)(?=#### День \d+|### Неделя \d+|^---$|^## Формат)/gm;
    
    let match;
    while ((match = dayPattern.exec(content)) !== null) {
      const dayNumber = parseInt(match[1], 10);
      const dayContent = match[2];
      
      try {
        const parsedDay = this.parseDayContent(dayNumber, dayContent);
        if (parsedDay) {
          days.push(parsedDay);
        }
      } catch (error) {
        console.error(`Ошибка при парсинге дня ${dayNumber}:`, error);
        throw error;
      }
    }
    
    return days;
  }

  /**
   * Парсит содержимое одного дня
   */
  private static parseDayContent(day: number, content: string): ParsedPregnancyDay | null {
    // Извлекаем значения полей
    const week = this.extractField(content, 'week');
    const trimester = this.extractField(content, 'trimester');
    const babySize = this.extractField(content, 'babySize');
    const babyWeight = this.extractField(content, 'babyWeight');
    const babyDevelopment = this.extractField(content, 'babyDevelopment');
    const motherChanges = this.extractField(content, 'motherChanges');
    const tips = this.extractTips(content);

    // Валидация обязательных полей
    if (!week || !trimester || !babySize || !babyWeight || !babyDevelopment || !motherChanges) {
      throw new Error(`Недостаточно данных для дня ${day}`);
    }

    return {
      day,
      week: parseInt(week, 10),
      trimester: parseInt(trimester, 10),
      babySize: babySize.trim(),
      babyWeight: babyWeight.trim(),
      babyDevelopment: babyDevelopment.trim(),
      motherChanges: motherChanges.trim(),
      tips: tips,
    };
  }

  /**
   * Извлекает значение поля из markdown контента
   */
  private static extractField(content: string, fieldName: string): string | null {
    // Паттерн: - **fieldName**: значение (может быть многострочным)
    // Используем флаг 's' для работы с многострочным текстом
    const pattern = new RegExp(`-\\s*\\*\\*${fieldName}\\*\\*:\\s*(.+?)(?=\\n-\\s*\\*\\*|$)`, 's');
    const match = content.match(pattern);
    
    if (match && match[1]) {
      // Убираем лишние пробелы и переносы строк в начале и конце
      return match[1].trim().replace(/\n\s*/g, ' ').trim();
    }
    
    return null;
  }

  /**
   * Извлекает массив советов (tips)
   */
  private static extractTips(content: string): string[] {
    const tips: string[] = [];
    
    // Ищем блок tips: - **tips**: затем все элементы списка с отступом
    const tipsPattern = /- \*\*tips\*\*:\s*\n((?: {2}- .+\n?)+)/;
    const tipsMatch = content.match(tipsPattern);
    
    if (tipsMatch && tipsMatch[1]) {
      const tipsContent = tipsMatch[1];
      // Ищем все элементы списка с отступом (2 пробела)
      const tipItemPattern = / {2}- (.+?)(?=\n {2}- |\n\n|$)/gu;
      let tipMatch;
      
      while ((tipMatch = tipItemPattern.exec(tipsContent)) !== null) {
        const tip = tipMatch[1].trim();
        if (tip) {
          tips.push(tip);
        }
      }
    }
    
    return tips;
  }

  /**
   * Валидирует распарсенные данные
   */
  static validateData(days: ParsedPregnancyDay[]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Проверка количества дней
    if (days.length !== 280) {
      errors.push(`Ожидалось 280 дней, получено ${days.length}`);
    }
    
    // Проверка уникальности дней
    const dayNumbers = days.map(d => d.day);
    const uniqueDays = new Set(dayNumbers);
    if (uniqueDays.size !== days.length) {
      errors.push('Обнаружены дублирующиеся дни');
    }
    
    // Проверка диапазона дней
    for (const day of days) {
      if (day.day < 1 || day.day > 280) {
        errors.push(`День ${day.day} вне допустимого диапазона (1-280)`);
      }
      
      if (day.week < 1 || day.week > 40) {
        errors.push(`Неделя ${day.week} для дня ${day.day} вне допустимого диапазона (1-40)`);
      }
      
      if (day.trimester < 1 || day.trimester > 3) {
        errors.push(`Триместр ${day.trimester} для дня ${day.day} вне допустимого диапазона (1-3)`);
      }
      
      if (!day.babySize || day.babySize.length === 0) {
        errors.push(`Отсутствует babySize для дня ${day.day}`);
      }
      
      if (!day.babyWeight || day.babyWeight.length === 0) {
        errors.push(`Отсутствует babyWeight для дня ${day.day}`);
      }
      
      if (!day.babyDevelopment || day.babyDevelopment.length === 0) {
        errors.push(`Отсутствует babyDevelopment для дня ${day.day}`);
      }
      
      if (!day.motherChanges || day.motherChanges.length === 0) {
        errors.push(`Отсутствует motherChanges для дня ${day.day}`);
      }
    }
    
    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

