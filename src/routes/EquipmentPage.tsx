import { useEquipmentLibrary } from '../hooks/useEquipmentLibrary'
import EquipmentList from '../components/equipment/EquipmentList'

export default function EquipmentPage() {
    const data = useEquipmentLibrary()

    return (
        <div>
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Equipment Library</h1>
                <p className="text-sm text-gray-500">Master list of all Robots, Weld Guns, and Stands.</p>
            </div>
            <EquipmentList data={data} />
        </div>
    )
}
