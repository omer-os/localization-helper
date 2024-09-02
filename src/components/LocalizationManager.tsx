'use client'
import React, { useState, useEffect, useRef } from 'react'
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { ClipboardCopyIcon, LanguagesIcon, KeyIcon, SearchIcon, Trash2Icon, FolderPlusIcon, GripVertical, UploadIcon } from 'lucide-react'
import { useToast } from "@/components/ui/use-toast"

interface Translation {
    id: string;
    key: string;
    group: string;
    [language: string]: string;
}

export default function LocalizationManager() {
    const [languages, setLanguages] = useState<string[]>(() => {
        const saved = localStorage.getItem('languages')
        return saved ? JSON.parse(saved) : ['English', 'Arabic', 'Turkish']
    })
    const [translations, setTranslations] = useState<Translation[]>(() => {
        const saved = localStorage.getItem('translations')
        return saved ? JSON.parse(saved) : [
            { id: '1', key: 'greeting', group: 'General', English: 'Hello', Arabic: 'مرحبا', Turkish: 'Merhaba' },
            { id: '2', key: 'goodbye', group: 'General', English: 'Goodbye', Arabic: 'وداعا', Turkish: 'Güle güle' },
        ]
    })
    const [groups, setGroups] = useState<string[]>(() => {
        const saved = localStorage.getItem('groups')
        return saved ? JSON.parse(saved) : ['General']
    })
    const [newLanguage, setNewLanguage] = useState('')
    const [newGroup, setNewGroup] = useState('')
    const [exportFormat, setExportFormat] = useState<'csv' | 'json' | 'text'>('csv')
    const [searchTerm, setSearchTerm] = useState('')
    const { toast } = useToast()

    const fileInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        localStorage.setItem('languages', JSON.stringify(languages))
        localStorage.setItem('translations', JSON.stringify(translations))
        localStorage.setItem('groups', JSON.stringify(groups))
    }, [languages, translations, groups])

    const addLanguage = () => {
        if (newLanguage && !languages.includes(newLanguage)) {
            setLanguages([...languages, newLanguage])
            setTranslations(translations.map(t => ({ ...t, [newLanguage]: '' })))
            setNewLanguage('')
            toast({ title: "Language Added", description: `${newLanguage} has been added to the localization matrix.` })
        }
    }

    const removeLanguage = (lang: string) => {
        setLanguages(languages.filter(l => l !== lang))
        setTranslations(translations.map(t => {
            const { [lang]: _, ...rest } = t;
            return rest as Translation;
        }))
        toast({ title: "Language Removed", description: `${lang} has been removed from the localization matrix.` })
    }

    const addGroup = () => {
        if (newGroup && !groups.includes(newGroup)) {
            setGroups([...groups, newGroup])
            setNewGroup('')
            toast({ title: "Group Added", description: `${newGroup} has been added to the groups.` })
        }
    }

    const removeGroup = (group: string) => {
        setGroups(groups.filter(g => g !== group))
        setTranslations(translations.filter(t => t.group !== group))
        toast({ title: "Group Removed", description: `${group} has been removed along with its translations.` })
    }

    const addTranslationKey = (group: string) => {
        const newKey = `new_key_${Date.now()}`
        setTranslations([...translations, { id: newKey, key: newKey, group, ...Object.fromEntries(languages.map(lang => [lang, ''])) }])
        toast({ title: "Key Added", description: `New translation key has been added to ${group}. Please edit the key name and translations in the table.` })
    }

    const removeTranslationKey = (key: string) => {
        setTranslations(translations.filter(t => t.key !== key))
        toast({ title: "Key Removed", description: `Translation key "${key}" has been removed.` })
    }

    const updateTranslation = (index: number, field: string, value: string) => {
        const updatedTranslations = [...translations]
        updatedTranslations[index] = { ...updatedTranslations[index], [field]: value }
        setTranslations(updatedTranslations)
    }

    const exportData = () => {
        let data: string
        switch (exportFormat) {
            case 'csv':
                data = [
                    ['group', 'key', ...languages].join(','),
                    ...translations.map(t => [t.group, t.key, ...languages.map(lang => t[lang])].join(','))
                ].join('\n')
                break
            case 'json':
                // Group translations by their group
                const groupedTranslations = translations.reduce((acc, t) => {
                    if (!acc[t.group]) {
                        acc[t.group] = {}
                    }
                    acc[t.group][t.key] = languages.reduce((langAcc, lang) => {
                        langAcc[lang] = t[lang]
                        return langAcc
                    }, {} as Record<string, string>)
                    return acc
                }, {} as Record<string, Record<string, Record<string, string>>>)

                data = JSON.stringify(groupedTranslations, null, 2)
                break
            case 'text':
                data = translations.map(t => `${t.group} - ${t.key}:\n${languages.map(lang => `  ${lang}: ${t[lang]}`).join('\n')}`).join('\n\n')
                break
        }
        navigator.clipboard.writeText(data)
            .then(() => toast({ title: "Exported to Clipboard", description: `Translations exported as ${exportFormat.toUpperCase()} to clipboard.` }))
            .catch(() => toast({ title: "Export Failed", description: "Failed to copy to clipboard. Please try again.", variant: "destructive" }))
    }



    const importTranslations = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (file) {
            const reader = new FileReader()
            reader.onload = (e) => {
                try {
                    const importedData = JSON.parse(e.target?.result as string)

                    // Update languages
                    const newLanguages = Array.from(new Set([...languages, ...Object.keys(importedData[0]).filter(key => key !== 'key' && key !== 'group')]))
                    setLanguages(newLanguages)

                    // Update groups
                    const newGroups = Array.from(new Set([...groups, ...importedData.map((item: any) => item.group)]))
                    setGroups(newGroups)

                    // Merge translations
                    const mergedTranslations = [...translations]
                    importedData.forEach((importedItem: any) => {
                        const existingIndex = mergedTranslations.findIndex(t => t.key === importedItem.key && t.group === importedItem.group)
                        if (existingIndex !== -1) {
                            mergedTranslations[existingIndex] = {
                                ...mergedTranslations[existingIndex],
                                ...importedItem
                            }
                        } else {
                            mergedTranslations.push({
                                id: `imported_${Date.now()}_${Math.random()}`,
                                ...importedItem
                            })
                        }
                    })
                    setTranslations(mergedTranslations)

                    toast({ title: "Import Successful", description: "Translations have been imported and merged with existing data." })
                } catch (error) {
                    toast({ title: "Import Failed", description: "Failed to parse the JSON file. Please check the file format.", variant: "destructive" })
                }
            }
            reader.readAsText(file)
        }
    }

    const triggerFileInput = () => {
        fileInputRef.current?.click()
    }

    const onDragEnd = (result: DropResult) => {
        const { destination, source, type } = result

        if (!destination) {
            return
        }

        if (destination.droppableId === source.droppableId && destination.index === source.index) {
            return
        }

        if (type === 'GROUP') {
            const newGroups = Array.from(groups)
            const [reorderedGroup] = newGroups.splice(source.index, 1)
            newGroups.splice(destination.index, 0, reorderedGroup)
            setGroups(newGroups)
        } else if (type === 'TRANSLATION') {
            const newTranslations = Array.from(translations)
            const [reorderedItem] = newTranslations.splice(source.index, 1)
            newTranslations.splice(destination.index, 0, reorderedItem)
            setTranslations(newTranslations)
        }
    }

    const filteredTranslations = translations.filter(t =>
        t.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
        Object.values(t).some(value => typeof value === 'string' && value.toLowerCase().includes(searchTerm.toLowerCase()))
    )

    return (
        <DragDropContext onDragEnd={onDragEnd}>
            <Card className="w-full max-w-7xl mx-auto">
                <CardHeader>
                    <CardTitle className="text-3xl font-bold">Localization Manager</CardTitle>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="translations" className="w-full">
                        <TabsList>
                            <TabsTrigger value="translations">Translations</TabsTrigger>
                            <TabsTrigger value="settings">Settings</TabsTrigger>
                        </TabsList>
                        <TabsContent value="translations">
                            <div className="flex justify-between items-center mb-4">
                                <div className="relative w-full max-w-sm">
                                    <SearchIcon className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                    <Input
                                        className="pl-8"
                                        placeholder="Search translations..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                                <div className="flex space-x-2">
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        style={{ display: 'none' }}
                                        onChange={importTranslations}
                                        accept=".json"
                                    />
                                    <Button onClick={triggerFileInput}>
                                        <UploadIcon className="mr-2 h-4 w-4" />Import JSON
                                    </Button>
                                    <Select value={exportFormat} onValueChange={(value: 'csv' | 'json' | 'text') => setExportFormat(value)}>
                                        <SelectTrigger className="w-[180px]">
                                            <SelectValue placeholder="Select export format" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="csv">CSV</SelectItem>
                                            <SelectItem value="json">JSON</SelectItem>
                                            <SelectItem value="text">Simple Text</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <Button onClick={exportData}><ClipboardCopyIcon className="mr-2 h-4 w-4" />Export</Button>
                                </div>
                            </div>
                            <Droppable droppableId="groups" type="GROUP">
                                {(provided) => (
                                    <Accordion type="multiple" className="w-full" {...provided.droppableProps} ref={provided.innerRef}>
                                        {groups.map((group, index) => (
                                            <Draggable key={group} draggableId={group} index={index}>
                                                {(provided) => (
                                                    <AccordionItem value={group} ref={provided.innerRef} {...provided.draggableProps}>
                                                        <AccordionTrigger className="text-lg font-semibold">
                                                            <div {...provided.dragHandleProps} className="mr-2">
                                                                <GripVertical size={16} />
                                                            </div>
                                                            {group}
                                                        </AccordionTrigger>
                                                        <AccordionContent>
                                                            <Droppable droppableId={`translations-${group}`} type="TRANSLATION">
                                                                {(provided) => (
                                                                    <div {...provided.droppableProps} ref={provided.innerRef}>
                                                                        <Table>
                                                                            <TableHeader>
                                                                                <TableRow>
                                                                                    <TableHead className="w-[30px]"></TableHead>
                                                                                    <TableHead className="w-[150px]">Key</TableHead>
                                                                                    {languages.map(lang => (
                                                                                        <TableHead key={lang}>{lang}</TableHead>
                                                                                    ))}
                                                                                    <TableHead className="w-[100px]">Actions</TableHead>
                                                                                </TableRow>
                                                                            </TableHeader>
                                                                            <TableBody>
                                                                                {filteredTranslations.filter(t => t.group === group).map((t, index) => (
                                                                                    <Draggable key={t.id} draggableId={t.id} index={index}>
                                                                                        {(provided) => (
                                                                                            <TableRow ref={provided.innerRef} {...provided.draggableProps}>
                                                                                                <TableCell>
                                                                                                    <div {...provided.dragHandleProps}>
                                                                                                        <GripVertical size={16} />
                                                                                                    </div>
                                                                                                </TableCell>
                                                                                                <TableCell className="font-medium">
                                                                                                    <Input
                                                                                                        value={t.key}
                                                                                                        onChange={(e) => updateTranslation(translations.indexOf(t), 'key', e.target.value)}
                                                                                                    />
                                                                                                </TableCell>
                                                                                                {languages.map(lang => (
                                                                                                    <TableCell key={lang}>
                                                                                                        <Input
                                                                                                            value={t[lang]}
                                                                                                            onChange={(e) => updateTranslation(translations.indexOf(t), lang, e.target.value)}
                                                                                                        />
                                                                                                    </TableCell>
                                                                                                ))}
                                                                                                <TableCell>
                                                                                                    <Button variant="ghost" size="icon" onClick={() => removeTranslationKey(t.key)}>
                                                                                                        <Trash2Icon className="h-4 w-4" />
                                                                                                    </Button>
                                                                                                </TableCell>
                                                                                            </TableRow>
                                                                                        )}
                                                                                    </Draggable>
                                                                                ))}
                                                                                {provided.placeholder}
                                                                            </TableBody>
                                                                        </Table>
                                                                    </div>
                                                                )}
                                                            </Droppable>
                                                            <Button onClick={() => addTranslationKey(group)} className="mt-4">
                                                                <KeyIcon className="mr-2 h-4 w-4" />Add Key to {group}
                                                            </Button>
                                                        </AccordionContent>
                                                    </AccordionItem>
                                                )}
                                            </Draggable>
                                        ))}
                                        {provided.placeholder}
                                    </Accordion>
                                )}
                            </Droppable>
                        </TabsContent>
                        <TabsContent value="settings">
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-lg font-semibold">Manage Languages</h3>
                                    <div className="flex space-x-2">
                                        <Input
                                            placeholder="New language"
                                            value={newLanguage}
                                            onChange={(e) => setNewLanguage(e.target.value)}
                                            className="w-40"
                                        />
                                        <Button onClick={addLanguage}><LanguagesIcon className="mr-2 h-4 w-4" />Add Language</Button>
                                    </div>
                                </div>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Language</TableHead>
                                            <TableHead className="w-[100px]">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {languages.map(lang => (
                                            <TableRow key={lang}>
                                                <TableCell>{lang}</TableCell>
                                                <TableCell>
                                                    <Button variant="ghost" size="icon" onClick={() => removeLanguage(lang)}>
                                                        <Trash2Icon className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                <div className="flex justify-between items-center mt-8">
                                    <h3 className="text-lg font-semibold">Manage Groups</h3>
                                    <div className="flex space-x-2">
                                        <Input
                                            placeholder="New group"
                                            value={newGroup}
                                            onChange={(e) => setNewGroup(e.target.value)}
                                            className="w-40"
                                        />
                                        <Button onClick={addGroup}><FolderPlusIcon className="mr-2 h-4 w-4" />Add Group</Button>
                                    </div>
                                </div>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Group</TableHead>
                                            <TableHead className="w-[100px]">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {groups.map(group => (
                                            <TableRow key={group}>
                                                <TableCell>{group}</TableCell>
                                                <TableCell>
                                                    <Button variant="ghost" size="icon" onClick={() => removeGroup(group)}>
                                                        <Trash2Icon className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </DragDropContext>
    )
}