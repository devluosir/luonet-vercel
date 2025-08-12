import { useMailForm } from '../hooks/useMailForm';
import { useMailGeneration } from '../hooks/useMailGeneration';
import { useMailStore } from '../state/mail.store';
import { useCanGenerateMail } from '../state/mail.selectors';
import { TextAreaField } from './TextAreaField';
import { SelectField } from './SelectField';
import { GenerateButton } from './GenerateButton';
import { LANGUAGE_OPTIONS, MAIL_TYPE_OPTIONS, FORM_LABELS, PLACEHOLDERS } from '../utils/constants';

export function MailForm() {
  const { field } = useMailForm();
  const { generateMail, isLoading } = useMailGeneration();
  const { mailType, setMailType } = useMailStore();
  const canGenerate = useCanGenerateMail();

  return (
    <div className="bg-white dark:bg-[#1c1c1e] shadow-sm border border-gray-200 dark:border-gray-800/80 rounded-xl p-6 lg:h-[710px] flex flex-col">
      <div className="space-y-6 flex-1">
        {/* 邮件内容输入框 */}
        <TextAreaField
          {...field('mail')}
          label={FORM_LABELS.mail}
          placeholder={PLACEHOLDERS.mail}
          required
          rows={12}
        />

        {/* 语言选择 */}
        <SelectField
          {...field('language')}
          label={FORM_LABELS.language}
          options={LANGUAGE_OPTIONS}
        />

        {/* 风格选择 */}
        <SelectField
          value={mailType}
          onChange={(e) => setMailType(e.target.value)}
          label={FORM_LABELS.replyType}
          options={MAIL_TYPE_OPTIONS}
        />

        {/* 生成按钮 */}
        <div className="mt-auto pt-4">
          <GenerateButton
            onClick={generateMail}
            loading={isLoading}
            disabled={!canGenerate}
          />
        </div>
      </div>
    </div>
  );
}
