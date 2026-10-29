<?php

namespace Tests\Feature;

use App\Models\TemplateDokumen;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\Concerns\CreatesKpFixtures;
use Tests\TestCase;

class TemplateDokumenTest extends TestCase
{
    use RefreshDatabase;
    use CreatesKpFixtures;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RoleSeeder::class);
        Storage::fake('local');
    }

    /* ---------- helper ---------- */

    private function buatTemplate(
        string $kode,
        string $modul = 'ta',
        bool $terlihatMahasiswa = true,
        bool $adaFile = true
    ): TemplateDokumen {
        $path = "templates/{$kode}/{$kode}.pdf";

        if ($adaFile) {
            Storage::disk('local')->put($path, 'isi template');
        }

        return TemplateDokumen::create([
            'kode' => $kode,
            'nama' => "Template {$kode}",
            'deskripsi' => null,
            'modul' => $modul,
            'terlihat_mahasiswa' => $terlihatMahasiswa,
            'nama_file' => "{$kode}.pdf",
            'path' => $path,
            'ukuran' => 12,
            'mime_type' => 'application/pdf',
        ]);
    }

    private function kirimTemplate(array $override = [])
    {
        return $this->post('/api/staff/templates', array_merge([
            'kode' => 'kuesioner-kp',
            'nama' => 'Template Kuesioner KP',
            'modul' => 'kp',
            'file' => UploadedFile::fake()->create('kuesioner.pdf', 100, 'application/pdf'),
        ], $override), ['Accept' => 'application/json']);
    }

    private function kodeDalam($response): array
    {
        return collect($response->json('data'))->pluck('kode')->sort()->values()->all();
    }

    /* ---------- kelola template (staff) ---------- */

    public function test_staff_bisa_menambah_template_dan_file_disimpan_privat(): void
    {
        Sanctum::actingAs($this->makeUser('staff'));

        $this->kirimTemplate()
            ->assertCreated()
            ->assertJsonPath('data.kode', 'kuesioner-kp')
            ->assertJsonPath('data.modul', 'kp')
            ->assertJsonPath('data.terlihat_mahasiswa', true)
            ->assertJsonPath('data.nama_file', 'kuesioner.pdf')
            ->assertJsonMissingPath('data.path');

        $template = TemplateDokumen::where('kode', 'kuesioner-kp')->firstOrFail();
        Storage::disk('local')->assertExists($template->path);
    }

    public function test_template_internal_bisa_dibuat_dengan_terlihat_mahasiswa_nol(): void
    {
        Sanctum::actingAs($this->makeUser('staff'));

        $this->kirimTemplate([
            'kode' => 'bap-sidang-ta',
            'modul' => 'ta',
            'terlihat_mahasiswa' => '0',
        ])
            ->assertCreated()
            ->assertJsonPath('data.terlihat_mahasiswa', false);
    }

    public function test_template_menerima_file_word(): void
    {
        Sanctum::actingAs($this->makeUser('staff'));

        $this->kirimTemplate([
            'kode' => 'logbook-ta',
            'modul' => 'ta',
            'file' => UploadedFile::fake()->create(
                'logbook.docx',
                50,
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            ),
        ])->assertCreated();
    }

    public function test_validasi_penambahan_template(): void
    {
        Sanctum::actingAs($this->makeUser('staff'));
        $this->buatTemplate('kuesioner-kp', 'kp');

        $this->kirimTemplate(['kode' => 'kuesioner-kp'])
            ->assertStatus(422)->assertJsonValidationErrors('kode');

        $this->kirimTemplate(['kode' => 'Logbook TA'])
            ->assertStatus(422)->assertJsonValidationErrors('kode');

        $this->kirimTemplate(['kode' => 'template-baru', 'modul' => 'lainnya'])
            ->assertStatus(422)->assertJsonValidationErrors('modul');

        $this->kirimTemplate([
            'kode' => 'template-baru',
            'file' => UploadedFile::fake()->create('gambar.png', 100, 'image/png'),
        ])->assertStatus(422)->assertJsonValidationErrors('file');

        $this->kirimTemplate(['kode' => 'template-baru', 'file' => null])
            ->assertStatus(422)->assertJsonValidationErrors('file');
    }

    public function test_mahasiswa_dan_dosen_tidak_bisa_mengelola_template(): void
    {
        $template = $this->buatTemplate('logbook-ta');

        foreach (['mahasiswa', 'dosen'] as $role) {
            Sanctum::actingAs($this->makeUser($role));

            $this->kirimTemplate(['kode' => 'template-baru'])->assertForbidden();
            $this->patchJson("/api/staff/templates/{$template->kode}", ['nama' => 'x'])->assertForbidden();
            $this->deleteJson("/api/staff/templates/{$template->kode}")->assertForbidden();
        }
    }

    public function test_staff_mengubah_informasi_template_dan_visibilitasnya(): void
    {
        $this->buatTemplate('logbook-ta');
        $staff = $this->makeUser('staff');
        $mahasiswa = $this->makeUser('mahasiswa');

        Sanctum::actingAs($staff);

        $this->patchJson('/api/staff/templates/logbook-ta', [
            'nama' => 'Template Logbook TA (revisi)',
            'terlihat_mahasiswa' => false,
        ])
            ->assertOk()
            ->assertJsonPath('data.nama', 'Template Logbook TA (revisi)')
            ->assertJsonPath('data.terlihat_mahasiswa', false);

        $this->patchJson('/api/staff/templates/logbook-ta', ['modul' => 'lainnya'])
            ->assertStatus(422)->assertJsonValidationErrors('modul');

        Sanctum::actingAs($mahasiswa);

        $this->getJson('/api/templates')->assertOk()->assertJsonCount(0, 'data');
    }

    public function test_staff_mengganti_file_template_dan_file_lama_terhapus(): void
    {
        $template = $this->buatTemplate('kuesioner-kp', 'kp');
        $pathLama = $template->path;

        Sanctum::actingAs($this->makeUser('staff'));

        $this->post('/api/staff/templates/kuesioner-kp/file', [
            'file' => UploadedFile::fake()->create('kuesioner-baru.pdf', 100, 'application/pdf'),
        ], ['Accept' => 'application/json'])
            ->assertOk()
            ->assertJsonPath('data.nama_file', 'kuesioner-baru.pdf');

        $template->refresh();

        $this->assertNotSame($pathLama, $template->path);
        Storage::disk('local')->assertMissing($pathLama);
        Storage::disk('local')->assertExists($template->path);
    }

    public function test_staff_menghapus_template_beserta_filenya(): void
    {
        $template = $this->buatTemplate('kuesioner-kp', 'kp');

        Sanctum::actingAs($this->makeUser('staff'));

        $this->deleteJson('/api/staff/templates/kuesioner-kp')->assertOk();

        $this->assertDatabaseMissing('template_dokumens', ['kode' => 'kuesioner-kp']);
        Storage::disk('local')->assertMissing($template->path);
    }

    /* ---------- daftar template ---------- */

    public function test_mahasiswa_hanya_melihat_template_yang_tidak_internal(): void
    {
        $this->buatTemplate('kuesioner-kp', 'kp');
        $this->buatTemplate('logbook-ta', 'ta');
        $this->buatTemplate('bap-sidang-ta', 'ta', false);

        Sanctum::actingAs($this->makeUser('mahasiswa'));

        $this->assertSame(
            ['kuesioner-kp', 'logbook-ta'],
            $this->kodeDalam($this->getJson('/api/templates')->assertOk())
        );
    }

    public function test_dosen_dan_staff_melihat_semua_template_termasuk_internal(): void
    {
        $this->buatTemplate('kuesioner-kp', 'kp');
        $this->buatTemplate('logbook-ta', 'ta');
        $this->buatTemplate('bap-sidang-ta', 'ta', false);

        foreach (['dosen', 'staff'] as $role) {
            Sanctum::actingAs($this->makeUser($role));

            $this->assertSame(
                ['bap-sidang-ta', 'kuesioner-kp', 'logbook-ta'],
                $this->kodeDalam($this->getJson('/api/templates')->assertOk())
            );
        }
    }

    public function test_daftar_template_bisa_difilter_per_modul(): void
    {
        $this->buatTemplate('kuesioner-kp', 'kp');
        $this->buatTemplate('logbook-ta', 'ta');

        Sanctum::actingAs($this->makeUser('mahasiswa'));

        $this->assertSame(
            ['kuesioner-kp'],
            $this->kodeDalam($this->getJson('/api/templates?modul=kp')->assertOk())
        );

        $this->getJson('/api/templates?modul=lainnya')->assertStatus(422);
    }

    /* ---------- unduh template ---------- */

    public function test_mahasiswa_bisa_mengunduh_template_umum(): void
    {
        $this->buatTemplate('kuesioner-kp', 'kp');

        Sanctum::actingAs($this->makeUser('mahasiswa'));

        $this->get('/api/templates/kuesioner-kp/download', ['Accept' => 'application/json'])
            ->assertOk();
    }

    public function test_template_internal_ditolak_untuk_mahasiswa_tetapi_boleh_untuk_dosen_dan_staff(): void
    {
        $this->buatTemplate('bap-sidang-ta', 'ta', false);

        Sanctum::actingAs($this->makeUser('mahasiswa'));
        $this->getJson('/api/templates/bap-sidang-ta/download')->assertForbidden();

        foreach (['dosen', 'staff'] as $role) {
            Sanctum::actingAs($this->makeUser($role));

            $this->get('/api/templates/bap-sidang-ta/download', ['Accept' => 'application/json'])
                ->assertOk();
        }
    }

    public function test_unduh_tanpa_login_ditolak_kode_tidak_dikenal_404_dan_file_hilang_404(): void
    {
        $this->buatTemplate('hilang-file', 'umum', true, false);

        $this->getJson('/api/templates/hilang-file/download')->assertUnauthorized();
        $this->getJson('/api/templates')->assertUnauthorized();

        Sanctum::actingAs($this->makeUser('mahasiswa'));

        $this->getJson('/api/templates/tidak-ada/download')->assertNotFound();
        $this->getJson('/api/templates/hilang-file/download')->assertNotFound();
    }
}
