import { useMailForm } from '../hooks/useMailForm';
import { useMailGeneration } from '../hooks/useMailGeneration';
import { useCanGenerateMail } from '../state/mail.selectors';
import { TextAreaField } from './TextAreaField';
import { SelectField } from './SelectField';
import { GenerateButton } from './GenerateButton';
import { LANGUAGE_OPTIONS, MAIL_TYPE_OPTIONS, FORM_LABELS, PLACEHOLDERS } from '../utils/constants';

export function ReplyForm() {
  const { field } = useMailForm();
  const { generateMail, isLoading } = useMailGeneration();
  const canGenerate = useCanGenerateMail();

  return (
    <div className="bg-white dark:bg-[#1c1c1e] shadow-sm border border-gray-200 dark:border-gray-800/80 rounded-xl p-6 lg:h-[710px] flex flex-col">
      <div className="space-y-6 flex-1">
        {/* 原始邮件内容 */}
        <TextAreaField
          {...field('replyTo')}
          label={FORM_LABELS.replyTo}
          placeholder={PLACEHOLDERS.replyTo}
          required
          rows={8}
        />

        {/* 回复内容 */}
        <TextAreaField
          {...field('reply')}
          label={FORM_LABELS.reply}
          placeholder={PLACEHOLDERS.reply}
          required
          rows={8}
        />

        {/* 语言选择 */}
        <SelectField
          {...field('replyLanguage')}
          label={FORM_LABELS.replyLanguage}
          options={LANGUAGE_OPTIONS}
        />

        {/* 风格选择 */}
        <SelectField
          {...field('replyType')}
          label={FORM_LABELS.replyType}
          options={MAIL_TYPE_OPTIONS}
        />

        {/* 生成按钮 */}
        <div className="mt-auto pt-4">
          <GenerateButton
            onClick={generateMail}
            loading={isLoading}
            disabled={!canGenerate}
            isReply
          />
        </div>
      </div>
    </div>
  );
}
