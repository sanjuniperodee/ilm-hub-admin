import { useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import {
  createDraftPushRules,
  createDraftPushTemplate,
  deleteDraftPushTemplate,
  getDraftPushRules,
  getPushRuleVersions,
  publishDraftPushRules,
  rollbackPushRules,
  updateDraftPushScenario,
  updateDraftPushSegmentPolicy,
  updateDraftPushTemplate,
  validateDraftPushRules,
  type PushRuleSet,
  type PushRuleVersion,
  type PushScenario,
} from '../../api/adminApi'
import { getErrorMessage } from '../../components/ui'

/** Draft rule-set state and all mutations of the automation tab (same API calls as before the redesign). */
export function usePushRules() {
  const [ruleSet, setRuleSet] = useState<PushRuleSet | null>(null)
  const [versions, setVersions] = useState<PushRuleVersion[]>([])
  const [validation, setValidation] = useState<{ ok: boolean; errors: string[] } | null>(null)
  const [selectedScenarioKey, setSelectedScenarioKey] = useState('')
  const [savingRules, setSavingRules] = useState(false)
  const [validating, setValidating] = useState(false)

  const selectedScenario = useMemo(
    () => ruleSet?.scenarios.find((item) => item.key === selectedScenarioKey) ?? null,
    [ruleSet, selectedScenarioKey],
  )

  const applyInitial = (draft: PushRuleSet, list: PushRuleVersion[]) => {
    setRuleSet(draft)
    setSelectedScenarioKey(draft.scenarios[0]?.key ?? '')
    setVersions(list)
  }

  const reloadRules = async () => {
    const [draftRes, versionsRes] = await Promise.all([getDraftPushRules(), getPushRuleVersions()])
    setRuleSet(draftRes.data)
    setVersions(versionsRes.data)
    if (!selectedScenarioKey) setSelectedScenarioKey(draftRes.data.scenarios[0]?.key ?? '')
  }

  const savePolicy = async (policy: PushRuleSet['policies'][number]) => {
    setSavingRules(true)
    try {
      const { data } = await updateDraftPushSegmentPolicy(policy.segment, policy)
      setRuleSet(data)
      toast.success('Ограничения сегмента сохранены в черновик')
      return true
    } catch (e) {
      toast.error(getErrorMessage(e, 'Не удалось сохранить ограничения сегмента'))
      return false
    } finally {
      setSavingRules(false)
    }
  }

  const updateScenario = async (scenario: PushScenario, patch: Partial<PushScenario>) => {
    setSavingRules(true)
    try {
      const { data } = await updateDraftPushScenario(scenario.key, patch)
      setRuleSet(data)
      toast.success('Сценарий сохранён в черновик')
    } catch (e) {
      toast.error(getErrorMessage(e, 'Не удалось сохранить сценарий'))
    } finally {
      setSavingRules(false)
    }
  }

  const updateTemplate = async (templateId: string, patch: any) => {
    setSavingRules(true)
    try {
      const { data } = await updateDraftPushTemplate(templateId, patch)
      setRuleSet(data)
    } catch (e) {
      toast.error(getErrorMessage(e, 'Не удалось сохранить текст'))
    } finally {
      setSavingRules(false)
    }
  }

  const createTemplate = async (title: string, body: string) => {
    if (!selectedScenario || !body.trim()) return false
    setSavingRules(true)
    try {
      const { data } = await createDraftPushTemplate(selectedScenario.key, {
        language: 'ru',
        title: title.trim() || 'ILM HUB',
        body: body.trim(),
        isActive: true,
      })
      setRuleSet(data)
      toast.success('Текст добавлен')
      return true
    } catch (e) {
      toast.error(getErrorMessage(e, 'Не удалось добавить текст'))
      return false
    } finally {
      setSavingRules(false)
    }
  }

  const deleteTemplate = async (templateId: string) => {
    setSavingRules(true)
    try {
      const { data } = await deleteDraftPushTemplate(templateId)
      setRuleSet(data)
      toast.success('Текст удалён')
    } catch (e) {
      toast.error(getErrorMessage(e, 'Не удалось удалить текст'))
    } finally {
      setSavingRules(false)
    }
  }

  const handleValidate = async () => {
    setValidating(true)
    try {
      const { data } = await validateDraftPushRules()
      setValidation(data)
    } catch (e) {
      toast.error(getErrorMessage(e, 'Не удалось проверить черновик'))
    } finally {
      setValidating(false)
    }
  }

  const handlePublish = async () => {
    setSavingRules(true)
    try {
      const { data } = await publishDraftPushRules()
      setRuleSet(data)
      setValidation({ ok: true, errors: [] })
      toast.success(`Опубликована версия ${data.version}`)
      await reloadRules()
    } catch (e: any) {
      const errors = e?.response?.data?.errors
      setValidation({ ok: false, errors: Array.isArray(errors) ? errors : [getErrorMessage(e, 'Не удалось опубликовать черновик')] })
    } finally {
      setSavingRules(false)
    }
  }

  const handleRollback = async () => {
    setSavingRules(true)
    try {
      const { data } = await rollbackPushRules()
      toast.success(`Откат выполнен к версии ${data.version}`)
      await reloadRules()
    } catch (e) {
      toast.error(getErrorMessage(e, 'Не удалось откатить правила'))
    } finally {
      setSavingRules(false)
    }
  }

  const handleCreateDraft = async () => {
    setSavingRules(true)
    try {
      await createDraftPushRules()
      await reloadRules()
      toast.success('Черновик обновлён')
    } catch (e) {
      toast.error(getErrorMessage(e, 'Не удалось создать черновик'))
    } finally {
      setSavingRules(false)
    }
  }

  return {
    ruleSet,
    versions,
    validation,
    setValidation,
    selectedScenarioKey,
    setSelectedScenarioKey,
    selectedScenario,
    savingRules,
    validating,
    applyInitial,
    savePolicy,
    updateScenario,
    updateTemplate,
    createTemplate,
    deleteTemplate,
    handleValidate,
    handlePublish,
    handleRollback,
    handleCreateDraft,
  }
}

export type PushRulesState = ReturnType<typeof usePushRules>
